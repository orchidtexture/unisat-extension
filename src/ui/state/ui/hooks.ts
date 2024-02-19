import { AppState } from '..';
import { useAppSelector } from '../hooks';

export function useUIState(): AppState['ui'] {
  return useAppSelector((state) => state.ui);
}

export function useAssetTabKey() {
  const uiState = useUIState();
  return uiState.assetTabKey;
}

export function useOrdinalsAssetTabKey() {
  const uiState = useUIState();
  return uiState.ordinalsAssetTabKey;
}

export function useBisonAssetTabKey() {
  const uiState = useUIState();
  return uiState.bisonAssetTabKey;
}

export function useAtomicalsAssetTabKey() {
  const uiState = useUIState();
  return uiState.atomicalsAssetTabKey;
}
