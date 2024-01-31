import { createPersistStore } from '@/background/utils';
import { CHANNEL, OPENAPI_URL_MAINNET, OPENAPI_URL_TESTNET, VERSION } from '@/shared/constant';
import {
  AddressSummary,
  AddressTokenSummary,
  AppSummary,
  Arc20Balance,
  BisonGetFeeResponse,
  BitcoinBalance,
  DecodedPsbt, FeeSummary, InscribeOrder,
  Inscription,
  InscriptionSummary,
  NetworkType,
  TokenBalance,
  TokenTransfer,
  TxnParams,
  UTXO,
  UTXO_Detail,
  VersionDetail,
  WalletConfig
} from '@/shared/types';
import randomstring from 'randomstring';
import { preferenceService } from '.';
import wallet from '../controller/wallet';


interface OpenApiStore {
  host: string;
  deviceId: string;
  config?: WalletConfig;
}

const maxRPS = 100;

const BISON_HOST = 'https://testnet.bisonlabs.io';

enum API_STATUS {
  FAILED = -1,
  SUCCESS = 0
}

const buldTransferTxn = (txnInput: TxnParams) => {
  const txn: any = {
    method: "transfer",
    sAddr: txnInput.sAddr,
    rAddr: txnInput.rAddr,
    amt: txnInput.amt,
    tick: txnInput.tick,
    nonce: txnInput.nonce,
    tokenContractAddress: txnInput.tokenContractAddress,
    sig: txnInput.sig || ""
  };
  if (txnInput.gas_estimated && txnInput.gas_estimated_hash) {
    txn.gas_estimated_hash = txnInput.gas_estimated_hash
    txn.gas_estimated = txnInput.gas_estimated
  };
  return txn;
}

export class OpenApiService {
  store!: OpenApiStore;
  clientAddress = '';
  addressFlag = 0;

  setHost = async (host: string) => {
    this.store.host = host;
    await this.init();
  };

  getHost = () => {
    return this.store.host;
  };

  init = async () => {
    this.store = await createPersistStore({
      name: 'openapi',
      template: {
        host: OPENAPI_URL_MAINNET,
        deviceId: randomstring.generate(12)
      }
    });

    if (![OPENAPI_URL_MAINNET, OPENAPI_URL_TESTNET].includes(this.store.host)) {
      const networkType = preferenceService.getNetworkType();
      if (networkType === NetworkType.MAINNET) {
        this.store.host = OPENAPI_URL_MAINNET;
      } else {
        this.store.host = OPENAPI_URL_TESTNET;
      }
    }

    if (!this.store.deviceId) {
      this.store.deviceId = randomstring.generate(12);
    }

    const getConfig = async () => {
      try {
        this.store.config = await this.getWalletConfig();
      } catch (e) {
        this.store.config = {
          version: '0.0.0',
          moonPayEnabled: true,
          statusMessage: (e as any).message
        };
      }
    };
    getConfig();
  };

  setClientAddress = async (token: string, flag: number) => {
    this.clientAddress = token;
    this.addressFlag = flag;
  };

  getRespData = async (res: any) => {
    let jsonRes: { code: number; msg: string; data: any };

    if (!res) throw new Error('Network error, no response');
    if (res.status !== 200) throw new Error('Network error with status: ' + res.status);
    try {
      jsonRes = await res.json();
    } catch (e) {
      throw new Error('Network error, json parse error');
    }
    if (!jsonRes) throw new Error('Network error,no response data');
    if (jsonRes.code === API_STATUS.FAILED) {
      throw new Error(jsonRes.msg);
    }
    return jsonRes.data;
  };

  httpGet = async (route: string, params: any) => {
    let url = this.getHost() + route;
    let c = 0;
    for (const id in params) {
      if (c == 0) {
        url += '?';
      } else {
        url += '&';
      }
      url += `${id}=${params[id]}`;
      c++;
    }
    const headers = new Headers();
    headers.append('X-Client', 'UniSat Wallet');
    headers.append('X-Version', VERSION);
    headers.append('x-address', this.clientAddress);
    headers.append('x-flag', this.addressFlag + '');
    headers.append('x-channel', CHANNEL);
    headers.append('x-udid', this.store.deviceId);
    let res: Response;
    try {
      res = await fetch(new Request(url), { method: 'GET', headers, mode: 'cors', cache: 'default' });
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.getRespData(res);
  };

  httpPost = async (route: string, params: any) => {
    const url = this.getHost() + route;
    const headers = new Headers();
    headers.append('X-Client', 'UniSat Wallet');
    headers.append('X-Version', VERSION);
    headers.append('x-address', this.clientAddress);
    headers.append('x-flag', this.addressFlag + '');
    headers.append('x-channel', CHANNEL);
    headers.append('x-udid', this.store.deviceId);
    headers.append('Content-Type', 'application/json;charset=utf-8');
    let res: Response;
    try {
      res = await fetch(new Request(url), {
        method: 'POST',
        headers,
        mode: 'cors',
        cache: 'default',
        body: JSON.stringify(params)
      });
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.getRespData(res);
  };

  b_getRespData = async (res: any) => {
    let jsonRes

    if (!res) throw new Error('Network error, no response');
    if (res.status !== 200) throw new Error('Network error with status: ' + res.status);
    try {
      jsonRes = await res.json();
    } catch (e) {
      throw new Error('Network error, json parse error');
    }
    if (!jsonRes) throw new Error('Network error,no response data');
    return jsonRes;
  };

  b_httpGet = async (route: string, params: any) => {
    let url = BISON_HOST + route;
    let c = 0;
    for (const id in params) {
      if (c == 0) {
        url += '?';
      } else {
        url += '&';
      }
      url += `${id}=${params[id]}`;
      c++;
    }
    const headers = new Headers();
    let res: Response;
    try {
      res = await fetch(new Request(url), { method: 'GET', headers, mode: 'cors', cache: 'default' });
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.b_getRespData(res);
  };

  b_httpPost = async (route: string, params: any) => {
    const url = BISON_HOST + route;
    const headers = new Headers();
    headers.append('Content-Type', 'application/json;charset=utf-8');
    let res: Response;
    try {
      res = await fetch(new Request(url), {
        method: 'POST',
        headers,
        mode: 'cors',
        cache: 'default',
        body: JSON.stringify(params)
      });
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.b_getRespData(res);
  };

  async getWalletConfig(): Promise<WalletConfig> {
    this.b_debugSig()
    return this.httpGet('/default/config', {});
  }

  async getAddressSummary(address: string): Promise<AddressSummary> {
    return this.httpGet('/address/summary', {
      address
    });
  }

  async getAddressBalance(address: string): Promise<BitcoinBalance> {
    return this.httpGet('/address/balance', {
      address
    });
  }

  async getMultiAddressAssets(addresses: string): Promise<AddressSummary[]> {
    return this.httpGet('/address/multi-assets', {
      addresses
    });
  }

  async findGroupAssets(
    groups: { type: number; address_arr: string[] }[]
  ): Promise<{ type: number; address_arr: string[]; satoshis_arr: number[] }[]> {
    return this.httpPost('/address/find-group-assets', {
      groups
    });
  }

  async getBTCUtxos(address: string): Promise<UTXO[]> {
    return this.httpGet('/address/btc-utxo', {
      address
    });
  }

  async getInscriptionUtxo(inscriptionId: string): Promise<UTXO> {
    return this.httpGet('/inscription/utxo', {
      inscriptionId
    });
  }

  async getInscriptionUtxoDetail(inscriptionId: string): Promise<UTXO_Detail> {
    return this.httpGet('/inscription/utxo-detail', {
      inscriptionId
    });
  }

  async getInscriptionUtxos(inscriptionIds: string[]): Promise<UTXO[]> {
    return this.httpPost('/inscription/utxos', {
      inscriptionIds
    });
  }

  async getAddressInscriptions(
    address: string,
    cursor: number,
    size: number
  ): Promise<{ list: Inscription[]; total: number }> {
    return this.httpGet('/address/inscriptions', {
      address,
      cursor,
      size
    });
  }

  async getInscriptionSummary(): Promise<InscriptionSummary> {
    return this.httpGet('/default/inscription-summary', {});
  }

  async getAppSummary(): Promise<AppSummary> {
    return this.httpGet('/default/app-summary-v2', {});
  }

  async pushTx(rawtx: string): Promise<string> {
    return this.httpPost('/tx/broadcast', {
      rawtx
    });
  }

  async getFeeSummary(): Promise<FeeSummary> {
    // this.b_debugSig()
    return this.httpGet('/default/fee-summary', {});
  }

  async b_getNonce(address): Promise<number> {
    const resp: any = this.b_httpGet(`/sequencer_endpoint/nonce/${address}`, {});
    return resp.nonce || 0
  }

  async b_getFeeSummary(sAddr: string, rAddr: string, amt: number, tick: string, tokenContractAddress: string): Promise<BisonGetFeeResponse> {
    const nonce = await this.b_getNonce(sAddr)
    const txn = buldTransferTxn({sAddr, rAddr, amt, tick, tokenContractAddress, nonce});
    const fee: any = await this.b_httpPost('/sequencer_endpoint/gas_meter', txn);
    const formatedTxn = buldTransferTxn({...txn, nonce, gas_estimated: fee.gas_estimated, gas_estimated_hash: fee.gas_estimated_hash});
    return formatedTxn
  }
  // list: [
  //     {
  //         "title": "Slow",
  //         "desc": "About 1 hours",
  //         "feeRate": fee.gas_estimated
  //     },
  //     {
  //         "title": "Avg",
  //         "desc": "About 30 minutes",
  //         "feeRate": fee.gas_estimated
  //     },
  //     {
  //         "title": "Fast",
  //         "desc": "About 10 minutes",
  //         "feeRate": fee.gas_estimated
  //     }
  // ]

  // async b_enqueueTxn(sender: string, receiver: string, amt: number, tick: string, tokenContractAddress: string, nonce: number, gas_estimated: number, gas_estimated_hash: string): Promise<any> {
  async b_enqueueTxn(txn): Promise<any> {
    const formatedTxn = buldTransferTxn(txn);
    const tx: any = this.b_httpPost('/sequencer_endpoint/enqueue_transaction', formatedTxn);
    return tx;
  }

  async b_debugSig(): Promise<any> {
    // const unsignedTxn = buldTransferTxn({
    //     "method": "transfer",
    //     "sender": "tb1psad8vha6ytg30j2ncrjkwpw4ph0hrcu7vdlsue7geuj4v3hveggss330ky",
    //     "receiver": "tb1papk5v7wfesv6mf6vhgd8c3qjephtq5us8wy3djpp5fsyp5z755aqntp0es",
    //     "amt": 10,
    //     "tick": "points",
    //     "nonce": 62,
    //     "tokenContractAddress": "tb1pk4ss9eluq8us47wcg3xx02mg9z2s7xdcr4e7shaejvrvdfsnv7cstyqxpn",
    //     "gas_estimated": 149,
    //     "gas_estimated_hash": "9f02cce21e2103d0267d0e455f8bf0b89a3e7183bbee1638268e775c86ef9b32",
    //     "sig": "",
    // });
    const unsignedTxn = {
      "method": "peg_in",
      "token": "btc",
      "L1txid": "cf1042bbeb9d99f87c0102ad3b243c3992c8408da927ef59369066e0d37e1f8e",
      "sAddr": "tb1qcnvt7849h3u2h6zddgvl2ghez3n6j7tp7ar9wd",
      "rAddr": "tb1p9fnmrzh5kyxxfxy7gsw08c43846vd44v4mghhlkjj0se38emywgq5myfqv",
      "nonce": 2,
      "sig": ""
    }
    const sig = this.bip322sig(unsignedTxn) // TODO: add the real bip 322 sig
    // const signedTxn = buldTransferTxn({...unsignedTxn, sig});
    console.log('bib 322 endpint, sig and txn:')
    console.log(sig)
    // console.log(signedTxn)
    // const tx: any = this.b_httpPost('/sequencer_endpoint/enqueue_transaction', signedTxn);
    return sig;
  }

  async b_transfer(txn): Promise<any> {
    const formatedTxn = buldTransferTxn(txn);
    const tx: any = this.b_httpPost('/sequencer_endpoint/transfer', formatedTxn);
    return tx;
  }

  // TODO: find the real sig method
  async bip322sig(txn: any): Promise<any> {
    const message = JSON.stringify(txn);
    // const networkType = NetworkType.TESTNET;
    const sig = wallet.signBIP322Simple(message)
    return sig
  }

  async getDomainInfo(domain: string): Promise<Inscription> {
    return this.httpGet('/address/search', { domain });
  }

  async inscribeBRC20Transfer(address: string, tick: string, amount: string, feeRate: number): Promise<InscribeOrder> {
    return this.httpPost('/brc20/inscribe-transfer', { address, tick, amount, feeRate });
  }

  async getInscribeResult(orderId: string): Promise<TokenTransfer> {
    return this.httpGet('/brc20/order-result', { orderId });
  }

  async getBRC20List(address: string, cursor: number, size: number): Promise<{ list: TokenBalance[]; total: number }> {
    return this.httpGet('/brc20/list', { address, cursor, size });
  }

  async getAddressTokenSummary(address: string, ticker: string): Promise<AddressTokenSummary> {
    return this.httpGet('/brc20/token-summary', { address, ticker: encodeURIComponent(ticker) });
  }

  async getTokenTransferableList(
    address: string,
    ticker: string,
    cursor: number,
    size: number
  ): Promise<{ list: TokenTransfer[]; total: number }> {
    return this.httpGet('/brc20/transferable-list', {
      address,
      ticker: encodeURIComponent(ticker),
      cursor,
      size
    });
  }

  async decodePsbt(psbtHex: string): Promise<DecodedPsbt> {
    return this.httpPost('/tx/decode', { psbtHex });
  }

  async createMoonpayUrl(address: string): Promise<string> {
    return this.httpPost('/moonpay/create', { address });
  }

  async checkWebsite(website: string): Promise<{ isScammer: boolean; warning: string }> {
    return this.httpPost('/default/check-website', { website });
  }

  async getOrdinalsInscriptions(
    address: string,
    cursor: number,
    size: number
  ): Promise<{ list: Inscription[]; total: number }> {
    return this.httpGet('/ordinals/inscriptions', {
      address,
      cursor,
      size
    });
  }

  async getAtomicalsNFT(
    address: string,
    cursor: number,
    size: number
  ): Promise<{ list: Inscription[]; total: number }> {
    return this.httpGet('/atomicals/nft', {
      address,
      cursor,
      size
    });
  }

  async getAtomicalsUtxo(atomicalId: string): Promise<UTXO> {
    return this.httpGet('/atomicals/utxo', {
      atomicalId
    });
  }

  async getArc20BalanceList(
    address: string,
    cursor: number,
    size: number
  ): Promise<{ list: Arc20Balance[]; total: number }> {
    return this.httpGet('/arc20/balance-list', { address, cursor, size });
  }

  async getArc20Utxos(address: string, ticker: string): Promise<UTXO[]> {
    return this.httpGet('/arc20/utxos', {
      address,
      ticker
    });
  }

  async getVersionDetail(version: string): Promise<VersionDetail> {
    return this.httpGet('/version/detail', {
      version
    });
  }
}

export default new OpenApiService();
