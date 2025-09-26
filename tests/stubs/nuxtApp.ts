export type FetchHandler = (url: string, options?: any) => any | Promise<any>;

let currentApp: { $fetch: FetchHandler } = {
  async $fetch(url: string) {
    throw new Error(`No fetch handler configured for ${url}`);
  }
};

export const __setNuxtAppStub = (app: { $fetch: FetchHandler }) => {
  currentApp = app;
};

export const useNuxtApp = () => currentApp;
