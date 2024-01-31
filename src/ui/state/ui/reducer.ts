import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';

export interface UIState {
  assetTabKey: AssetTabKey;
  bisonAssetTabKey: BisonAssetTabKey;
  atomicalsAssetTabKey: AtomicalsAssetTabKey;
}

export enum AssetTabKey {
  BISON,
  BITCOIN
  // ORDINALS,
  // ATOMICALS
}

export enum BisonAssetTabKey {
  ALL,
}

// export enum OrdinalsAssetTabKey {
//   ALL,
//   BRC20
// }

export enum AtomicalsAssetTabKey {
  ALL,
  ARC20,
  OTHERS
}

export const initialState: UIState = {
  assetTabKey: AssetTabKey.BISON,
  bisonAssetTabKey: BisonAssetTabKey.ALL,
  atomicalsAssetTabKey: AtomicalsAssetTabKey.ARC20
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    reset(state) {
      return initialState;
    },
    updateAssetTabScreen(
      state,
      action: {
        payload: {
          assetTabKey?: AssetTabKey;
          bisonAssetTabKey?: BisonAssetTabKey;
          atomicalsAssetTabKey?: AtomicalsAssetTabKey;
        };
      }
    ) {
      const { payload } = action;
      if (payload.assetTabKey !== undefined) {
        state.assetTabKey = payload.assetTabKey;
      }
      if (payload.bisonAssetTabKey !== undefined) {
        state.bisonAssetTabKey = payload.bisonAssetTabKey;
      }
      if (payload.atomicalsAssetTabKey !== undefined) {
        state.atomicalsAssetTabKey = payload.atomicalsAssetTabKey;
      }
      return state;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(updateVersion, (state) => {
      // todo
      if (!state.assetTabKey) {
        state.assetTabKey = AssetTabKey.BISON;
      }
      if (!state.bisonAssetTabKey) {
        state.bisonAssetTabKey = BisonAssetTabKey.ALL;
      }
      if (!state.atomicalsAssetTabKey) {
        state.atomicalsAssetTabKey = AtomicalsAssetTabKey.ARC20;
      }
    });
  }
});

export const uiActions = slice.actions;
export default slice.reducer;
