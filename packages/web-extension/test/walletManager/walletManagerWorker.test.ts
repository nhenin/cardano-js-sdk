/* eslint-disable @typescript-eslint/no-explicit-any */
import { EMPTY, firstValueFrom } from 'rxjs';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { logger } from '@cardano-sdk/util-dev';

import { MinimalRuntime, consumeRemoteApi, exposeApi } from '../../src/messaging';
import { WalletFactory, WalletManagerWorker, keyAgentChannel } from '../../src';

jest.mock('../../src/messaging', () => {
  const originalModule = jest.requireActual('../../src/messaging');
  return {
    __esModule: true,
    ...originalModule,
    consumeRemoteApi: jest.fn().mockReturnValue({ shutdown: jest.fn() }),
    exposeApi: jest.fn().mockReturnValue({ shutdown: jest.fn() })
  };
});

const expectWalletChannelClosed = () => {
  const hostSubscription = exposeApi({} as any, {} as any);
  expect(hostSubscription.shutdown).toHaveBeenCalled();
};

describe('WalletManagerWorker', () => {
  const observableWalletName = 'dummyWallet';
  const walletId =
    // eslint-disable-next-line max-len
    '0-2-da7b4795b11a79116eb5232c83d2c862';
  let walletManager: WalletManagerWorker;
  let walletFactoryCreate: jest.Mock;
  let mockWallet: ObservableWallet;
  const runtime: MinimalRuntime = { connect: jest.fn(), onConnect: jest.fn() as any };

  const mockStoreA = { destroy: jest.fn().mockReturnValue(EMPTY), id: `${walletId}-A` };
  const mockStoreB = { destroy: jest.fn().mockReturnValue(EMPTY), id: `${walletId}-B` };

  const expectWalletDeactivated = () => {
    const keyAgentSubscription = consumeRemoteApi({} as any, {} as any);
    expect(keyAgentSubscription.shutdown).toHaveBeenCalled();
    expect(mockWallet.shutdown).toHaveBeenCalled();
  };

  beforeEach(() => {
    mockWallet = {
      shutdown: jest.fn()
    } as unknown as ObservableWallet;

    walletFactoryCreate = jest.fn().mockResolvedValue(mockWallet);
    const walletFactory: WalletFactory = { create: walletFactoryCreate };

    walletManager = new WalletManagerWorker(
      { walletName: 'ccvault' },
      {
        logger,
        runtime,
        storesFactory: {
          create: jest.fn().mockReturnValueOnce(mockStoreA).mockReturnValueOnce(mockStoreB)
        },
        walletFactory
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes WalletManagerApi messenger', () => {
    expect(exposeApi).toHaveBeenCalled();
  });

  describe('activate', () => {
    beforeEach(async () => {
      await walletManager.activate({ observableWalletName, walletId });
    });

    it('consumes keyAgent messenger associated with the wallet', async () => {
      const consumeRemoteApiMock = consumeRemoteApi as jest.Mock;
      expect(consumeRemoteApiMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({ baseChannel: keyAgentChannel(walletId) })
      );
    });

    it('uses the configured messenger runtime when consuming apis', async () => {
      const consumeRemoteApiMock = consumeRemoteApi as jest.Mock;
      expect(consumeRemoteApiMock.mock.calls[0][1]).toEqual(expect.objectContaining({ runtime }));
    });

    it('uses wallet factory to create new wallet', () => {
      expect(walletFactoryCreate).toHaveBeenCalled();
    });

    it('persists the store when activating multiple times', async () => {
      const storesFirstActivation = walletFactoryCreate.mock.calls[0][1].stores;
      await walletManager.deactivate();
      await walletManager.activate({ observableWalletName, walletId });
      const storesSecondActivation = walletFactoryCreate.mock.calls[1][1].stores;
      expect(storesFirstActivation).toBe(storesSecondActivation);
    });

    it('recreates the store if it was cleared', async () => {
      const storesFirstActivation = walletFactoryCreate.mock.calls[0][1].stores;
      await walletManager.destroy();
      await walletManager.activate({ observableWalletName, walletId });
      const storesSecondActivation = walletFactoryCreate.mock.calls[1][1].stores;
      expect(storesFirstActivation).not.toBe(storesSecondActivation);
    });

    it('sets active wallet to wallet created by factory', async () => {
      const activeWallet = await firstValueFrom(walletManager.activeWallet$);
      expect(activeWallet).toEqual(mockWallet);
    });

    it('does not activate same wallet twice', async () => {
      await walletManager.activate({ observableWalletName, walletId });
      expect(walletFactoryCreate).toHaveBeenCalledTimes(1);
    });

    it('deactivates previous wallet when activating a new one', async () => {
      await walletManager.activate({ observableWalletName, walletId: 'another-id' });
      expectWalletDeactivated();
    });

    it('destroys store on destroy active wallet', async () => {
      await walletManager.destroy();
      expect(mockStoreA.destroy).toHaveBeenCalledTimes(1);
    });
  });

  it('deactivate shuts down the active wallet and key agent remote api', async () => {
    await walletManager.activate({ observableWalletName, walletId });
    await walletManager.deactivate();
    expectWalletDeactivated();
  });

  it('shutdown deactivates wallet, key agent and wallet remote apis', async () => {
    await walletManager.activate({ observableWalletName, walletId });
    walletManager.shutdown();
    expectWalletDeactivated();
    expectWalletChannelClosed();
  });
});
