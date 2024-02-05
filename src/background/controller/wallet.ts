import {
  contactBookService,
  keyringService,
  notificationService,
  openapiService,
  permissionService,
  preferenceService,
  sessionService
} from '@/background/service';
import i18n from '@/background/service/i18n';
import { DisplayedKeyring, Keyring } from '@/background/service/keyring';
import {
  ADDRESS_TYPES,
  AddressFlagType,
  BISONAPI_URL_TESTNET,
  BRAND_ALIAN_TYPE_TEXT,
  CHAINS_ENUM,
  COIN_NAME,
  COIN_SYMBOL,
  KEYRING_TYPE,
  KEYRING_TYPES,
  NETWORK_TYPES,
  OPENAPI_URL_MAINNET,
  OPENAPI_URL_TESTNET
} from '@/shared/constant';
import {
  Account,
  AddressType,
  AddressUserToSignInput,
  BisonBalance,
  BisonGetFeeResponse,
  BisonTxnResponse,
  BitcoinBalance,
  ContractBison,
  NetworkType,
  PublicKeyUserToSignInput,
  SignPsbtOptions,
  ToSignInput,
  TxnParams,
  UTXO,
  WalletKeyring
} from '@/shared/types';
import { checkAddressFlag } from '@/shared/utils';
import { UnspentOutput, txHelpers } from '@unisat/wallet-sdk';
import { publicKeyToAddress, scriptPkToAddress } from '@unisat/wallet-sdk/lib/address';
import { ECPair, bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core';
import { signMessageOfBIP322Simple } from '@unisat/wallet-sdk/lib/message';
import { toPsbtNetwork } from '@unisat/wallet-sdk/lib/network';
import { toXOnly } from '@unisat/wallet-sdk/lib/utils';
import { toUpper } from 'lodash';
import { ContactBookItem } from '../service/contactBook';
import { OpenApiService, buldPegInTxn } from '../service/openapi';
import { ConnectedSite } from '../service/permission';
import BaseController from './base';

const stashKeyrings: Record<string, Keyring> = {};
export type AccountAsset = {
  name: string;
  symbol: string;
  amount: string;
  value: string;
};

export class WalletController extends BaseController {
  openapi: OpenApiService = openapiService;

  /* wallet */
  boot = (password: string) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();

  getApproval = notificationService.getApproval;
  resolveApproval = notificationService.resolveApproval;
  rejectApproval = notificationService.rejectApproval;

  hasVault = () => keyringService.hasVault();
  verifyPassword = (password: string) => keyringService.verifyPassword(password);
  changePassword = (password: string, newPassword: string) => keyringService.changePassword(password, newPassword);

  initAlianNames = async () => {
    preferenceService.changeInitAlianNameStatus();
    const contacts = this.listContact();
    const keyrings = await keyringService.getAllDisplayedKeyrings();

    keyrings.forEach((v) => {
      v.accounts.forEach((w, index) => {
        this.updateAlianName(w.pubkey, `${BRAND_ALIAN_TYPE_TEXT[v.type]} ${index + 1}`);
      });
    });

    if (contacts.length !== 0 && keyrings.length !== 0) {
      const allAccounts = keyrings.map((item) => item.accounts).flat();
      const sameAddressList = contacts.filter((item) => allAccounts.find((contact) => contact.pubkey == item.address));
      if (sameAddressList.length > 0) {
        sameAddressList.forEach((item) => this.updateAlianName(item.address, item.name));
      }
    }
  };

  isReady = () => {
    if (contactBookService.store) {
      return true;
    } else {
      return false;
    }
  };

  unlock = async (password: string) => {
    const alianNameInited = preferenceService.getInitAlianNameStatus();
    const alianNames = contactBookService.listAlias();
    await keyringService.submitPassword(password);
    sessionService.broadcastEvent('unlock');
    if (!alianNameInited && alianNames.length === 0) {
      this.initAlianNames();
    }
  };
  isUnlocked = () => {
    return keyringService.memStore.getState().isUnlocked;
  };

  lockWallet = async () => {
    await keyringService.setLocked();
    sessionService.broadcastEvent('accountsChanged', []);
    sessionService.broadcastEvent('lock');
  };

  setPopupOpen = (isOpen: boolean) => {
    preferenceService.setPopupOpen(isOpen);
  };

  getAddressBalance = async (address: string) => {
    const data = await openapiService.getAddressBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
  };

  getMultiAddressAssets = async (addresses: string) => {
    return openapiService.getMultiAddressAssets(addresses);
  };

  findGroupAssets = (groups: { type: number; address_arr: string[] }[]) => {
    return openapiService.findGroupAssets(groups);
  };

  getAddressCacheBalance = (address: string | undefined): BitcoinBalance => {
    const defaultBalance: BitcoinBalance = {
      confirm_amount: '0',
      pending_amount: '0',
      amount: '0',
      usd_value: '0',
      confirm_btc_amount: '0',
      pending_btc_amount: '0',
      btc_amount: '0',
      confirm_inscription_amount: '0',
      pending_inscription_amount: '0',
      inscription_amount: '0'
    };
    if (!address) return defaultBalance;
    return preferenceService.getAddressBalance(address) || defaultBalance;
  };

  getAddressHistory = async (address: string) => {
    // const data = await openapiService.getAddressRecentHistory(address);
    // preferenceService.updateAddressHistory(address, data);
    // return data;
    //   todo
  };

  getAddressInscriptions = async (address: string, cursor: number, size: number) => {
    const data = await openapiService.getAddressInscriptions(address, cursor, size);
    return data;
  };

  getAddressCacheHistory = (address: string | undefined) => {
    if (!address) return [];
    return preferenceService.getAddressHistory(address);
  };

  getExternalLinkAck = () => {
    preferenceService.getExternalLinkAck();
  };

  setExternalLinkAck = (ack) => {
    preferenceService.setExternalLinkAck(ack);
  };

  getLocale = () => {
    return preferenceService.getLocale();
  };

  setLocale = (locale: string) => {
    preferenceService.setLocale(locale);
  };

  getCurrency = () => {
    return preferenceService.getCurrency();
  };

  setCurrency = (currency: string) => {
    preferenceService.setCurrency(currency);
  };

  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  getPrivateKey = async (password: string, { pubkey, type }: { pubkey: string; type: string }) => {
    await this.verifyPassword(password);
    const keyring = await keyringService.getKeyringForAccount(pubkey, type);
    if (!keyring) return null;
    const privateKey = await keyring.exportAccount(pubkey);
    const networkType = this.getNetworkType();
    const network = toPsbtNetwork(networkType);
    const hex = privateKey;
    const wif = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network }).toWIF();
    return {
      hex,
      wif
    };
  };

  getMnemonics = async (password: string, keyring: WalletKeyring) => {
    await this.verifyPassword(password);
    const originKeyring = keyringService.keyrings[keyring.index];
    const serialized = await originKeyring.serialize();
    return {
      mnemonic: serialized.mnemonic,
      hdPath: serialized.hdPath,
      passphrase: serialized.passphrase
    };
  };

  createKeyringWithPrivateKey = async (data: string, addressType: AddressType, alianName?: string) => {
    const error = new Error(i18n.t('The private key is invalid'));

    let originKeyring: Keyring;
    try {
      originKeyring = await keyringService.importPrivateKey(data, addressType);
    } catch (e) {
      console.log(e);
      throw e;
    }
    const pubkeys = await originKeyring.getAccounts();
    if (alianName) this.updateAlianName(pubkeys[0], alianName);

    const displayedKeyring = await keyringService.displayForKeyring(
      originKeyring,
      addressType,
      keyringService.keyrings.length - 1
    );
    const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, keyringService.keyrings.length - 1);
    this.changeKeyring(keyring);
  };

  getPreMnemonics = () => keyringService.getPreMnemonics();
  generatePreMnemonic = () => keyringService.generatePreMnemonic();
  removePreMnemonics = () => keyringService.removePreMnemonics();
  createKeyringWithMnemonics = async (
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount: number
  ) => {
    const originKeyring = await keyringService.createKeyringWithMnemonics(
      mnemonic,
      hdPath,
      passphrase,
      addressType,
      accountCount
    );
    keyringService.removePreMnemonics();

    const displayedKeyring = await keyringService.displayForKeyring(
      originKeyring,
      addressType,
      keyringService.keyrings.length - 1
    );
    const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, keyringService.keyrings.length - 1);
    this.changeKeyring(keyring);
    preferenceService.setShowSafeNotice(true);
  };

  createTmpKeyringWithMnemonics = async (
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount = 1
  ) => {
    const activeIndexes: number[] = [];
    for (let i = 0; i < accountCount; i++) {
      activeIndexes.push(i);
    }
    const originKeyring = keyringService.createTmpKeyring('HD Key Tree', {
      mnemonic,
      activeIndexes,
      hdPath,
      passphrase
    });
    const displayedKeyring = await keyringService.displayForKeyring(originKeyring, addressType, -1);
    return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
  };

  createTmpKeyringWithPrivateKey = async (privateKey: string, addressType: AddressType) => {
    const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.SimpleKeyring, [privateKey]);
    const displayedKeyring = await keyringService.displayForKeyring(originKeyring, addressType, -1);
    preferenceService.setShowSafeNotice(true);
    return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
  };

  removeKeyring = async (keyring: WalletKeyring) => {
    await keyringService.removeKeyring(keyring.index);
    const keyrings = await this.getKeyrings();
    const nextKeyring = keyrings[keyrings.length - 1];
    if (nextKeyring && nextKeyring.accounts[0]) {
      this.changeKeyring(nextKeyring);
      return nextKeyring;
    }
  };

  getKeyringByType = (type: string) => {
    return keyringService.getKeyringByType(type);
  };

  deriveNewAccountFromMnemonic = async (keyring: WalletKeyring, alianName?: string) => {
    const _keyring = keyringService.keyrings[keyring.index];
    const result = await keyringService.addNewAccount(_keyring);
    if (alianName) this.updateAlianName(result[0], alianName);

    const currentKeyring = await this.getCurrentKeyring();
    if (!currentKeyring) throw new Error('no current keyring');
    keyring = currentKeyring;
    this.changeKeyring(keyring, keyring.accounts.length - 1);
  };

  getAccountsCount = async () => {
    const accounts = await keyringService.getAccounts();
    return accounts.filter((x) => x).length;
  };

  changeKeyring = (keyring: WalletKeyring, accountIndex = 0) => {
    preferenceService.setCurrentKeyringIndex(keyring.index);
    preferenceService.setCurrentAccount(keyring.accounts[accountIndex]);
    const flag = preferenceService.getAddressFlag(keyring.accounts[accountIndex].address);
    openapiService.setClientAddress(keyring.accounts[accountIndex].address, flag);
  };

  getAllAddresses = (keyring: WalletKeyring, index: number) => {
    const networkType = this.getNetworkType();
    const addresses: string[] = [];
    const _keyring = keyringService.keyrings[keyring.index];
    if (keyring.type === KEYRING_TYPE.HdKeyring) {
      const pathPubkey: { [path: string]: string } = {};
      ADDRESS_TYPES.filter((v) => v.displayIndex >= 0).forEach((v) => {
        let pubkey = pathPubkey[v.hdPath];
        if (!pubkey && _keyring.getAccountByHdPath) {
          pubkey = _keyring.getAccountByHdPath(v.hdPath, index);
        }
        const address = publicKeyToAddress(pubkey, v.value, networkType);
        addresses.push(address);
      });
    } else {
      ADDRESS_TYPES.filter((v) => v.displayIndex >= 0 && v.isUnisatLegacy === false).forEach((v) => {
        const pubkey = keyring.accounts[index].pubkey;
        const address = publicKeyToAddress(pubkey, v.value, networkType);
        addresses.push(address);
      });
    }
    return addresses;
  };

  changeAddressType = async (addressType: AddressType) => {
    const currentAccount = await this.getCurrentAccount();
    const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
    await keyringService.changeAddressType(currentKeyringIndex, addressType);
    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    this.changeKeyring(keyring, currentAccount?.index);
  };

  signTransaction = async (type: string, from: string, psbt: bitcoin.Psbt, inputs: ToSignInput[]) => {
    const keyring = await keyringService.getKeyringForAccount(from, type);
    return keyringService.signTransaction(keyring, psbt, inputs);
  };

  formatOptionsToSignInputs = async (_psbt: string | bitcoin.Psbt, options?: SignPsbtOptions) => {
    const account = await this.getCurrentAccount();
    if (!account) throw null;

    let toSignInputs: ToSignInput[] = [];
    if (options && options.toSignInputs) {
      // We expect userToSignInputs objects to be similar to ToSignInput interface,
      // but we allow address to be specified in addition to publicKey for convenience.
      toSignInputs = options.toSignInputs.map((input) => {
        const index = Number(input.index);
        if (isNaN(index)) throw new Error('invalid index in toSignInput');

        if (!(input as AddressUserToSignInput).address && !(input as PublicKeyUserToSignInput).publicKey) {
          throw new Error('no address or public key in toSignInput');
        }

        if ((input as AddressUserToSignInput).address && (input as AddressUserToSignInput).address != account.address) {
          throw new Error('invalid address in toSignInput');
        }

        if (
          (input as PublicKeyUserToSignInput).publicKey &&
          (input as PublicKeyUserToSignInput).publicKey != account.pubkey
        ) {
          throw new Error('invalid public key in toSignInput');
        }

        const sighashTypes = input.sighashTypes?.map(Number);
        if (sighashTypes?.some(isNaN)) throw new Error('invalid sighash type in toSignInput');

        return {
          index,
          publicKey: account.pubkey,
          sighashTypes,
          disableTweakSigner: input.disableTweakSigner
        };
      });
    } else {
      const networkType = this.getNetworkType();
      const psbtNetwork = toPsbtNetwork(networkType);

      const psbt =
        typeof _psbt === 'string'
          ? bitcoin.Psbt.fromHex(_psbt as string, { network: psbtNetwork })
          : (_psbt as bitcoin.Psbt);
      psbt.data.inputs.forEach((v, index) => {
        let script: any = null;
        let value = 0;
        if (v.witnessUtxo) {
          script = v.witnessUtxo.script;
          value = v.witnessUtxo.value;
        } else if (v.nonWitnessUtxo) {
          const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
          const output = tx.outs[psbt.txInputs[index].index];
          script = output.script;
          value = output.value;
        }
        const isSigned = v.finalScriptSig || v.finalScriptWitness;
        if (script && !isSigned) {
          const address = scriptPkToAddress(script, networkType);
          if (account.address === address) {
            toSignInputs.push({
              index,
              publicKey: account.pubkey,
              sighashTypes: v.sighashType ? [v.sighashType] : undefined
            });
          }
        }
      });
    }
    return toSignInputs;
  };

  signPsbt = async (psbt: bitcoin.Psbt, toSignInputs: ToSignInput[], autoFinalized: boolean) => {
    const account = await this.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    const _keyring = keyringService.keyrings[keyring.index];

    const networkType = this.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);

    if (!toSignInputs) {
      // Compatibility with legacy code.
      toSignInputs = await this.formatOptionsToSignInputs(psbt);
      if (autoFinalized !== false) autoFinalized = true;
    }
    psbt.data.inputs.forEach((v, index) => {
      const isNotSigned = !(v.finalScriptSig || v.finalScriptWitness);
      const isP2TR = keyring.addressType === AddressType.P2TR || keyring.addressType === AddressType.M44_P2TR;
      const lostInternalPubkey = !v.tapInternalKey;
      // Special measures taken for compatibility with certain applications.
      if (isNotSigned && isP2TR && lostInternalPubkey) {
        const tapInternalKey = toXOnly(Buffer.from(account.pubkey, 'hex'));
        const { output } = bitcoin.payments.p2tr({
          internalPubkey: tapInternalKey,
          network: psbtNetwork
        });
        if (v.witnessUtxo?.script.toString('hex') == output?.toString('hex')) {
          v.tapInternalKey = tapInternalKey;
        }
      }
    });
    psbt = await keyringService.signTransaction(_keyring, psbt, toSignInputs);
    if (autoFinalized) {
      toSignInputs.forEach((v) => {
        // psbt.validateSignaturesOfInput(v.index, validator);
        psbt.finalizeInput(v.index);
      });
    }
    return psbt;
  };

  signMessage = async (text: string) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const sig = keyringService.signMessage(account.pubkey, text);
    return sig
  };

  signBIP322Simple = async (text: string) => {
    console.log('firmando 322')
    console.log(text)
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const networkType = this.getNetworkType();
    const sig = signMessageOfBIP322Simple({
      message: text,
      address: account.address,
      networkType,
      wallet: this as any
    });
    return sig
  };

  requestKeyring = (type: string, methodName: string, keyringId: number | null, ...params) => {
    let keyring;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(type);
      } catch {
        const Keyring = keyringService.getKeyringClassForType(type);
        keyring = new Keyring();
      }
    }
    if (keyring[methodName]) {
      return keyring[methodName].call(keyring, ...params);
    }
  };

  private _getKeyringByType = (type: string): Keyring => {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw new Error(`No ${type} keyring found`);
  };

  addContact = (data: ContactBookItem) => {
    contactBookService.addContact(data);
  };

  updateContact = (data: ContactBookItem) => {
    contactBookService.updateContact(data);
  };

  removeContact = (address: string) => {
    contactBookService.removeContact(address);
  };

  listContact = (includeAlias = true) => {
    const list = contactBookService.listContacts();
    if (includeAlias) {
      return list;
    } else {
      return list.filter((item) => !item.isAlias);
    }
  };

  getContactsByMap = () => {
    return contactBookService.getContactsByMap();
  };

  getContactByAddress = (address: string) => {
    return contactBookService.getContactByAddress(address);
  };

  private _generateAlianName = (type: string, index: number) => {
    const alianName = `${BRAND_ALIAN_TYPE_TEXT[type]} ${index}`;
    return alianName;
  };

  getNextAlianName = (keyring: WalletKeyring) => {
    return this._generateAlianName(keyring.type, keyring.accounts.length + 1);
  };

  getHighlightWalletList = () => {
    return preferenceService.getWalletSavedList();
  };

  updateHighlightWalletList = (list) => {
    return preferenceService.updateWalletSavedList(list);
  };

  getAlianName = (pubkey: string) => {
    const contactName = contactBookService.getContactByAddress(pubkey)?.name;
    return contactName;
  };

  updateAlianName = (pubkey: string, name: string) => {
    contactBookService.updateAlias({
      name,
      address: pubkey
    });
  };

  getAllAlianName = () => {
    return contactBookService.listAlias();
  };

  getInitAlianNameStatus = () => {
    return preferenceService.getInitAlianNameStatus();
  };

  updateInitAlianNameStatus = () => {
    preferenceService.changeInitAlianNameStatus();
  };

  getIsFirstOpen = () => {
    return preferenceService.getIsFirstOpen();
  };

  updateIsFirstOpen = () => {
    return preferenceService.updateIsFirstOpen();
  };

  listChainAssets = async (pubkeyAddress: string) => {
    const balance = await openapiService.getAddressBalance(pubkeyAddress);
    const assets: AccountAsset[] = [
      { name: COIN_NAME, symbol: COIN_SYMBOL, amount: balance.amount, value: balance.usd_value }
    ];
    return assets;
  };

  reportErrors = (error: string) => {
    console.error('report not implemented');
  };

  getNetworkType = () => {
    const networkType = preferenceService.getNetworkType();
    return networkType;
  };

  setNetworkType = async (networkType: NetworkType) => {
    preferenceService.setNetworkType(networkType);
    if (networkType === NetworkType.MAINNET) {
      this.openapi.setHost(OPENAPI_URL_MAINNET);
    } else {
      this.openapi.setHost(OPENAPI_URL_TESTNET);
    }
    const network = this.getNetworkName();
    sessionService.broadcastEvent('networkChanged', {
      network
    });

    const currentAccount = await this.getCurrentAccount();
    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    this.changeKeyring(keyring, currentAccount?.index);
  };

  getNetworkName = () => {
    const networkType = preferenceService.getNetworkType();
    return NETWORK_TYPES[networkType].name;
  };

  getBTCUtxos = async () => {
    // getBTCAccount
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    let utxos = await openapiService.getBTCUtxos(account.address);

    if (openapiService.addressFlag == 1) {
      utxos = utxos.filter((v) => (v as any).height !== 4194303);
    }

    const btcUtxos = utxos.map((v) => {
      return {
        txid: v.txid,
        vout: v.vout,
        satoshis: v.satoshis,
        scriptPk: v.scriptPk,
        addressType: v.addressType,
        pubkey: account.pubkey,
        inscriptions: v.inscriptions,
        atomicals: v.atomicals
      };
    });
    return btcUtxos;
  };

  getAssetUtxosAtomicalsFT = async (ticker: string) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    let arc20_utxos = await openapiService.getArc20Utxos(account.address, ticker);
    arc20_utxos = arc20_utxos.filter((v) => (v as any).spent == false);

    const assetUtxos = arc20_utxos.map((v) => {
      return Object.assign(v, { pubkey: account.pubkey });
    });
    return assetUtxos;
  };

  sendBTC = async ({
    to,
    amount,
    feeRate,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    amount: number;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = this.getNetworkType();

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const { psbt, toSignInputs } = await txHelpers.sendBTC({
      btcUtxos: btcUtxos,
      tos: [{ address: to, satoshis: amount }],
      networkType,
      changeAddress: account.address,
      feeRate,
      enableRBF
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  sendAllBTC = async ({
    to,
    feeRate,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = this.getNetworkType();

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const { psbt, toSignInputs } = await txHelpers.sendAllBTC({
      btcUtxos: btcUtxos,
      toAddress: to,
      networkType,
      feeRate,
      enableRBF
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  sendOrdinalsInscription = async ({
    to,
    inscriptionId,
    feeRate,
    outputValue,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    inscriptionId: string;
    feeRate: number;
    outputValue: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = preferenceService.getNetworkType();

    const utxo = await openapiService.getInscriptionUtxo(inscriptionId);
    if (!utxo) {
      throw new Error('UTXO not found.');
    }

    // if (utxo.inscriptions.length > 1) {
    //   throw new Error('Multiple inscriptions are mixed together. Please split them first.');
    // }

    const assetUtxo = Object.assign(utxo, { pubkey: account.pubkey });

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const { psbt, toSignInputs } = await txHelpers.sendInscription({
      assetUtxo,
      btcUtxos,
      toAddress: to,
      networkType,
      changeAddress: account.address,
      feeRate,
      outputValue,
      enableRBF,
      enableMixed: true
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  sendOrdinalsInscriptions = async ({
    to,
    inscriptionIds,
    feeRate,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    inscriptionIds: string[];
    utxos: UTXO[];
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = preferenceService.getNetworkType();

    const inscription_utxos = await openapiService.getInscriptionUtxos(inscriptionIds);
    if (!inscription_utxos) {
      throw new Error('UTXO not found.');
    }

    if (inscription_utxos.find((v) => v.inscriptions.length > 1)) {
      throw new Error('Multiple inscriptions are mixed together. Please split them first.');
    }

    const assetUtxos = inscription_utxos.map((v) => {
      return Object.assign(v, { pubkey: account.pubkey });
    });

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const { psbt, toSignInputs } = await txHelpers.sendInscriptions({
      assetUtxos,
      btcUtxos,
      toAddress: to,
      networkType,
      changeAddress: account.address,
      feeRate,
      enableRBF
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);

    return psbt.toHex();
  };

  splitOrdinalsInscription = async ({
    inscriptionId,
    feeRate,
    outputValue,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    inscriptionId: string;
    feeRate: number;
    outputValue: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = preferenceService.getNetworkType();

    const utxo = await openapiService.getInscriptionUtxo(inscriptionId);
    if (!utxo) {
      throw new Error('UTXO not found.');
    }

    const assetUtxo = Object.assign(utxo, { pubkey: account.pubkey });

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    const { psbt, toSignInputs, splitedCount } = await txHelpers.splitInscriptionUtxo({
      assetUtxo,
      btcUtxos,
      networkType,
      changeAddress: account.address,
      feeRate,
      enableRBF,
      outputValue
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return {
      psbtHex: psbt.toHex(),
      splitedCount
    };
  };

  pushTx = async (rawtx: string) => {
    const txid = await this.openapi.pushTx(rawtx);
    return txid;
  };

  // signBisonTx = async (rawtx: TxnParams): Promise<string> => {
  //   console.log('Bison sign')
  //   const networkType = this.getNetworkType();
  //   let sig = ""
  //   const signMessageOptions = {
  //     payload: {
  //       network: {
  //         type: "Testnet",
  //       },
  //       address: rawtx.sAddr,
  //       message: JSON.stringify(rawtx),
  //     },
  //     onFinish: (response) => {
  //       console.log("response signature")
  //       console.log(response)
  //       sig = response;
  //     },
  //     onCancel: () => console.log("Request canceled."),
  //   };
  //   console.log('Data:')
  //   console.log(signMessageOptions)
  //   await signMessage(signMessageOptions);
  //   console.log(sig)
  //   return sig;
  // }

  bridgeBtcToBison =async (txId: string) => {
    console.log('BRIDGE')
    const BISON_DEFAULT_TOKEN = 'btc';

    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const nonce = await this.openapi.b_getNonce(account.address);
    const rawtx = {
      L1txid: txId,
      tick: BISON_DEFAULT_TOKEN,
      sAddr: account.address,
      rAddr: account.address,
      nonce: nonce + 1,
    }
    const formatedTxn = buldPegInTxn(rawtx)
    const sig = await this.signBIP322Simple(JSON.stringify(formatedTxn));
    const signedTxn = {...formatedTxn, sig};
    console.log(signedTxn)
    // const txnResp = await this.openapi.b_sendPegInTxn(signedTxn);
    // return txnResp;
    return {}
  }

  enqueueTx = async (rawtx: TxnParams,): Promise<BisonTxnResponse> => {
    const sig = await this.signBIP322Simple(JSON.stringify(rawtx));
    const signedTxn = {...rawtx, sig};
    const txnResp = await this.openapi.b_enqueueTxn(signedTxn);
    return txnResp;
  };

  getAccounts = async () => {
    const keyrings = await this.getKeyrings();
    const accounts: Account[] = keyrings.reduce<Account[]>((pre, cur) => pre.concat(cur.accounts), []);
    return accounts;
  };

  displayedKeyringToWalletKeyring = (displayedKeyring: DisplayedKeyring, index: number, initName = true) => {
    const networkType = preferenceService.getNetworkType();
    const addressType = displayedKeyring.addressType;
    const key = 'keyring_' + index;
    const type = displayedKeyring.type;
    const accounts: Account[] = [];
    for (let j = 0; j < displayedKeyring.accounts.length; j++) {
      const { pubkey } = displayedKeyring.accounts[j];
      const address = publicKeyToAddress(pubkey, addressType, networkType);
      const accountKey = key + '#' + j;
      const defaultName = this.getAlianName(pubkey) || this._generateAlianName(type, j + 1);
      const alianName = preferenceService.getAccountAlianName(accountKey, defaultName);
      const flag = preferenceService.getAddressFlag(address);
      accounts.push({
        type,
        pubkey,
        address,
        alianName,
        index: j,
        key: accountKey,
        flag
      });
    }
    const hdPath = type === KEYRING_TYPE.HdKeyring ? displayedKeyring.keyring.hdPath : '';
    const alianName = preferenceService.getKeyringAlianName(
      key,
      initName ? `${KEYRING_TYPES[type].alianName} #${index + 1}` : ''
    );
    const keyring: WalletKeyring = {
      index,
      key,
      type,
      addressType,
      accounts,
      alianName,
      hdPath
    };
    return keyring;
  };

  getKeyrings = async (): Promise<WalletKeyring[]> => {
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    const keyrings: WalletKeyring[] = [];
    for (let index = 0; index < displayedKeyrings.length; index++) {
      const displayedKeyring = displayedKeyrings[index];
      if (displayedKeyring.type !== KEYRING_TYPE.Empty) {
        const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, displayedKeyring.index);
        keyrings.push(keyring);
      }
    }

    return keyrings;
  };

  getCurrentKeyring = async () => {
    let currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    if (currentKeyringIndex === undefined) {
      const currentAccount = preferenceService.getCurrentAccount();
      for (let i = 0; i < displayedKeyrings.length; i++) {
        if (displayedKeyrings[i].type !== currentAccount?.type) {
          continue;
        }
        const found = displayedKeyrings[i].accounts.find((v) => v.pubkey === currentAccount?.pubkey);
        if (found) {
          currentKeyringIndex = i;
          break;
        }
      }
      if (currentKeyringIndex === undefined) {
        currentKeyringIndex = 0;
      }
    }

    if (
      !displayedKeyrings[currentKeyringIndex] ||
      displayedKeyrings[currentKeyringIndex].type === KEYRING_TYPE.Empty ||
      !displayedKeyrings[currentKeyringIndex].accounts[0]
    ) {
      for (let i = 0; i < displayedKeyrings.length; i++) {
        if (displayedKeyrings[i].type !== KEYRING_TYPE.Empty) {
          currentKeyringIndex = i;
          preferenceService.setCurrentKeyringIndex(currentKeyringIndex);
          break;
        }
      }
    }
    const displayedKeyring = displayedKeyrings[currentKeyringIndex];
    if (!displayedKeyring) return null;
    return this.displayedKeyringToWalletKeyring(displayedKeyring, currentKeyringIndex);
  };

  getCurrentAccount = async () => {
    const currentKeyring = await this.getCurrentKeyring();
    if (!currentKeyring) return null;
    const account = preferenceService.getCurrentAccount();
    let currentAccount: Account | undefined = undefined;
    currentKeyring.accounts.forEach((v) => {
      if (v.pubkey === account?.pubkey) {
        currentAccount = v;
      }
    });
    if (!currentAccount) {
      currentAccount = currentKeyring.accounts[0];
    }
    if (currentAccount) {
      currentAccount.flag = preferenceService.getAddressFlag(currentAccount.address);
      openapiService.setClientAddress(currentAccount.address, currentAccount.flag);
    }
    return currentAccount;
  };

  getEditingKeyring = async () => {
    const editingKeyringIndex = preferenceService.getEditingKeyringIndex();
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    const displayedKeyring = displayedKeyrings[editingKeyringIndex];
    return this.displayedKeyringToWalletKeyring(displayedKeyring, editingKeyringIndex);
  };

  setEditingKeyring = async (index: number) => {
    preferenceService.setEditingKeyringIndex(index);
  };

  getEditingAccount = async () => {
    const account = preferenceService.getEditingAccount();
    return account;
  };

  setEditingAccount = async (account: Account) => {
    preferenceService.setEditingAccount(account);
  };

  queryDomainInfo = async (domain: string) => {
    const data = await openapiService.getDomainInfo(domain);
    return data;
  };

  getInscriptionSummary = async () => {
    const data = await openapiService.getInscriptionSummary();
    return data;
  };

  getAppSummary = async () => {
    const appTab = preferenceService.getAppTab();
    try {
      const data = await openapiService.getAppSummary();
      const readTabTime = appTab.readTabTime;
      data.apps.forEach((w) => {
        const readAppTime = appTab.readAppTime[w.id];
        if (w.time) {
          if (Date.now() > w.time + 1000 * 60 * 60 * 24 * 7) {
            w.new = false;
          } else if (readAppTime && readAppTime > w.time) {
            w.new = false;
          } else {
            w.new = true;
          }
        } else {
          w.new = false;
        }
      });
      data.readTabTime = readTabTime;
      preferenceService.setAppSummary(data);
      return data;
    } catch (e) {
      console.log('getAppSummary error:', e);
      return appTab.summary;
    }
  };

  readTab = async () => {
    return preferenceService.setReadTabTime(Date.now());
  };

  readApp = async (appid: number) => {
    return preferenceService.setReadAppTime(appid, Date.now());
  };

  getAddressUtxo = async (address: string) => {
    const data = await openapiService.getBTCUtxos(address);
    return data;
  };

  getConnectedSite = permissionService.getConnectedSite;
  getSite = permissionService.getSite;
  getConnectedSites = permissionService.getConnectedSites;
  setRecentConnectedSites = (sites: ConnectedSite[]) => {
    permissionService.setRecentConnectedSites(sites);
  };
  getRecentConnectedSites = () => {
    return permissionService.getRecentConnectedSites();
  };
  getCurrentSite = (tabId: number): ConnectedSite | null => {
    const { origin, name, icon } = sessionService.getSession(tabId) || {};
    if (!origin) {
      return null;
    }
    const site = permissionService.getSite(origin);
    if (site) {
      return site;
    }
    return {
      origin,
      name,
      icon,
      chain: CHAINS_ENUM.BTC,
      isConnected: false,
      isSigned: false,
      isTop: false
    };
  };
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = sessionService.getSession(tabId) || {};
    return permissionService.getWithoutUpdate(origin);
  };
  setSite = (data: ConnectedSite) => {
    permissionService.setSite(data);
    if (data.isConnected) {
      const network = this.getNetworkName();
      sessionService.broadcastEvent(
        'networkChanged',
        {
          network
        },
        data.origin
      );
    }
  };
  updateConnectSite = (origin: string, data: ConnectedSite) => {
    permissionService.updateConnectSite(origin, data);
    const network = this.getNetworkName();
    sessionService.broadcastEvent(
      'networkChanged',
      {
        network
      },
      data.origin
    );
  };
  removeAllRecentConnectedSites = () => {
    const sites = permissionService.getRecentConnectedSites().filter((item) => !item.isTop);
    sites.forEach((item) => {
      this.removeConnectedSite(item.origin);
    });
  };
  removeConnectedSite = (origin: string) => {
    sessionService.broadcastEvent('accountsChanged', [], origin);
    permissionService.removeConnectedSite(origin);
  };

  setKeyringAlianName = (keyring: WalletKeyring, name: string) => {
    preferenceService.setKeyringAlianName(keyring.key, name);
    keyring.alianName = name;
    return keyring;
  };

  setAccountAlianName = (account: Account, name: string) => {
    preferenceService.setAccountAlianName(account.key, name);
    account.alianName = name;
    return account;
  };

  addAddressFlag = (account: Account, flag: AddressFlagType) => {
    account.flag = preferenceService.addAddressFlag(account.address, flag);
    openapiService.setClientAddress(account.address, account.flag);
    return account;
  };
  removeAddressFlag = (account: Account, flag: AddressFlagType) => {
    account.flag = preferenceService.removeAddressFlag(account.address, flag);
    openapiService.setClientAddress(account.address, account.flag);
    return account;
  };

  getFeeSummary = async () => {
    return openapiService.getFeeSummary();
  };

  enqueueTxTest = async (rawTx: BisonGetFeeResponse) => {
    return openapiService.enqueueTxTest(rawTx);
  };

  b_getFeeSummary = async (address: string, receiver: string, tick: string, amount: number, tokenAddress: string) => {
    return openapiService.b_getFeeSummary(address, receiver, amount, tick, tokenAddress);
  };

  b_bridgeBTCToBison = async (txId: string) => {
    return openapiService.b_bridgeBTCToBison(txId);
  };

  inscribeBRC20Transfer = (address: string, tick: string, amount: string, feeRate: number) => {
    return openapiService.inscribeBRC20Transfer(address, tick, amount, feeRate);
  };

  getInscribeResult = (orderId: string) => {
    return openapiService.getInscribeResult(orderId);
  };

  decodePsbt = (psbtHex: string) => {
    return openapiService.decodePsbt(psbtHex);
  };

  getBRC20List = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const uiCachedData = preferenceService.getUICachedData(address);
    if (uiCachedData.brc20List[currentPage]) {
      return uiCachedData.brc20List[currentPage];
    }

    const { total, list } = await openapiService.getBRC20List(address, cursor, size);
    uiCachedData.brc20List[currentPage] = {
      currentPage,
      pageSize,
      total,
      list
    };
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getBisonList = async (address: string, currentPage: number, pageSize: number) => {
    const uiCachedData = preferenceService.getUICachedData(address);

    const res = await fetch(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`)
    const data = await res.json();
    const total = data.contracts.length
    const contracts: ContractBison[] = data.contracts

    const balancePromises = contracts.map(async (contract) => {
      const balanceEndpoint = `${contract.contractEndpoint}/balance`;

      try {
        const response = await fetch(balanceEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: address,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const balanceResponse = await response.json();

        return {
          ticker: toUpper(contract.tick),
          balance: balanceResponse.balance,
        };
      } catch (error) {
        // In case of an error in a specific request, return null
        return null;
      }
    });

    // Ejecutar todas las solicitudes de balance
    const allBalances = await Promise.all(balancePromises);

    // Filtrar los balances que sean mayores que 0 y no sean null
    const list = allBalances.filter(balance => balance && balance.balance > 0) as BisonBalance[];
    uiCachedData.bisonList[currentPage] = {
      currentPage,
      pageSize,
      total,
      list
    };
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getBisonContractBalances = async (address: string) => {
    const res = await fetch(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`)
    const data = await res.json();
    const contracts: ContractBison[] = data.contracts

    const balancePromises = contracts.map(async (contract) => {
      const balanceEndpoint = `${contract.contractEndpoint}/balance`;

      try {
        const response = await fetch(balanceEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: address,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const balanceResponse = await response.json();

        return {
          ticker: toUpper(contract.tick),
          balance: balanceResponse.balance,
        };
      } catch (error) {
        // In case of an error in a specific request, return null
        return null;
      }
    });

    const allBalances = await Promise.all(balancePromises);

    const list = allBalances.filter(balance => balance && balance.balance > 0) as BisonBalance[];
    return list
  };


  getBisonContractBalance = async (address: string, contract: ContractBison): Promise<BisonBalance> => {
    try {
      const balanceEndpoint = `${contract.contractEndpoint}/balance`;
      const response = await fetch(balanceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const balanceResponse = await response.json();
      return {
        ticker: contract.tick,
        balance: balanceResponse.balance as number,
        contractAddress: contract.contractAddr
      };
    } catch (error) {
      return {
        ticker: toUpper(contract.tick),
        balance: 0,
        contractAddress: ''
      }
    }
  }

  getAllInscriptionList = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const uiCachedData = preferenceService.getUICachedData(address);
    if (uiCachedData.allInscriptionList[currentPage]) {
      return uiCachedData.allInscriptionList[currentPage];
    }

    const { total, list } = await openapiService.getAddressInscriptions(address, cursor, size);
    uiCachedData.allInscriptionList[currentPage] = {
      currentPage,
      pageSize,
      total,
      list
    };
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getBRC20Summary = async (address: string, ticker: string) => {
    const uiCachedData = preferenceService.getUICachedData(address);
    if (uiCachedData.brc20Summary[ticker]) {
      return uiCachedData.brc20Summary[ticker];
    }

    const tokenSummary = await openapiService.getAddressTokenSummary(address, ticker);
    uiCachedData.brc20Summary[ticker] = tokenSummary;
    return tokenSummary;
  };

  getBRC20TransferableList = async (address: string, ticker: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const uiCachedData = preferenceService.getUICachedData(address);
    if (uiCachedData.brc20TransferableList[ticker] && uiCachedData.brc20TransferableList[ticker][currentPage]) {
      return uiCachedData.brc20TransferableList[ticker][currentPage];
    }
    if (!uiCachedData.brc20TransferableList[ticker]) {
      uiCachedData.brc20TransferableList[ticker] = [];
    }

    const { total, list } = await openapiService.getTokenTransferableList(address, ticker, cursor, size);
    uiCachedData.brc20TransferableList[ticker][currentPage] = {
      currentPage,
      pageSize,
      total,
      list
    };
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  expireUICachedData = (address: string) => {
    return preferenceService.expireUICachedData(address);
  };

  createMoonpayUrl = (address: string) => {
    return openapiService.createMoonpayUrl(address);
  };

  getWalletConfig = () => {
    return openapiService.getWalletConfig();
  };

  getSkippedVersion = () => {
    return preferenceService.getSkippedVersion();
  };

  setSkippedVersion = (version: string) => {
    return preferenceService.setSkippedVersion(version);
  };

  getInscriptionUtxoDetail = async (inscriptionId: string) => {
    const utxo = await openapiService.getInscriptionUtxoDetail(inscriptionId);
    if (!utxo) {
      throw new Error('UTXO not found.');
    }
    return utxo;
  };

  getUtxoByInscriptionId = async (inscriptionId: string) => {
    const utxo = await openapiService.getInscriptionUtxo(inscriptionId);
    if (!utxo) {
      throw new Error('UTXO not found.');
    }
    return utxo;
  };

  checkWebsite = (website: string) => {
    return openapiService.checkWebsite(website);
  };

  getArc20BalanceList = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const { total, list } = await openapiService.getArc20BalanceList(address, cursor, size);

    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getOrdinalsInscriptions = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const { total, list } = await openapiService.getOrdinalsInscriptions(address, cursor, size);
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getAtomicalsNFTs = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;

    const { total, list } = await openapiService.getAtomicalsNFT(address, cursor, size);
    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  sendAtomicalsNFT = async ({
    to,
    atomicalId,
    feeRate,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    atomicalId: string;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = preferenceService.getNetworkType();

    const utxo = await openapiService.getAtomicalsUtxo(atomicalId);
    if (!utxo) {
      throw new Error('UTXO not found.');
    }

    if (utxo.inscriptions.length > 1) {
      throw new Error('Multiple inscriptions are mixed together. Please split them first.');
    }

    const assetUtxo = Object.assign(utxo, { pubkey: account.pubkey });

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const { psbt, toSignInputs } = await txHelpers.sendAtomicalsNFT({
      assetUtxo,
      btcUtxos,
      toAddress: to,
      networkType,
      changeAddress: account.address,
      feeRate,
      enableRBF
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  sendAtomicalsFT = async ({
    to,
    ticker,
    amount,
    feeRate,
    enableRBF,
    btcUtxos,
    assetUtxos
  }: {
    to: string;
    ticker: string;
    amount: number;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UnspentOutput[];
    assetUtxos?: UnspentOutput[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = preferenceService.getNetworkType();

    if (!assetUtxos) {
      assetUtxos = await this.getAssetUtxosAtomicalsFT(ticker);
    }

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    const _assetUtxos: UnspentOutput[] = [];
    let total = 0;
    let change = 0;
    for (let i = 0; i < assetUtxos.length; i++) {
      const v = assetUtxos[i];
      total += v.satoshis;
      _assetUtxos.push(v);
      if (total >= amount) {
        change = total - amount;
        if (change == 0 || change > 546) {
          break;
        }
      }
    }
    if (change != 0 && change < 546) {
      throw new Error('Can not construct change greater than 546.');
    }
    assetUtxos = _assetUtxos;

    const { psbt, toSignInputs } = await txHelpers.sendAtomicalsFT({
      assetUtxos,
      btcUtxos,
      toAddress: to,
      networkType,
      changeAddress: account.address,
      changeAssetAddress: account.address,
      feeRate,
      enableRBF,
      sendAmount: amount
    });

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);

    return psbt.toHex();
  };

  getAddressSummary = async (address: string) => {
    const data = await openapiService.getAddressSummary(address);
    // preferenceService.updateAddressBalance(address, data);
    return data;
  };

  setPsbtSignNonSegwitEnable(psbt: bitcoin.Psbt, enabled: boolean) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = enabled;
  }

  getShowSafeNotice = () => {
    return preferenceService.getShowSafeNotice();
  };

  setShowSafeNotice = (show: boolean) => {
    return preferenceService.setShowSafeNotice(show);
  };

  getVersionDetail = (version: string) => {
    return openapiService.getVersionDetail(version);
  };

  isAtomicalsEnabled = async () => {
    const current = await this.getCurrentAccount();
    if (!current) return false;
    return checkAddressFlag(current?.flag, AddressFlagType.Is_Enable_Atomicals);
  };
}

export default new WalletController();
