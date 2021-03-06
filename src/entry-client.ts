import createApp from '@/app';

let {app, router, store} = createApp();

// @ts-ignore
if (window.__INITIAL_STATE__) {
    // We initialize the store state with the data injected from the server
    // @ts-ignore
    let state = JSON.parse(window.__INITIAL_STATE__);
    store.hydrateNetwork(state.network, state.networkId);
}

router.onReady(() => {
    app.$mount('#app')
})
