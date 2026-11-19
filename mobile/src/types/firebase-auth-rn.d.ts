/**
 * Firebase sí exporta getReactNativePersistence en su build de React Native
 * (Metro la usa en ejecución), pero los tipos públicos de "firebase/auth"
 * apuntan a la versión web y no la declaran. Esta declaración lo corrige.
 */
import type { Persistence, ReactNativeAsyncStorage } from "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
