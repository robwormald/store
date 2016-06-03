import {provide, OpaqueToken, Provider, Injector} from '@angular/core';

import { Reducer } from './reducer';
import { Dispatcher } from './dispatcher';
import { Store } from './store';
import { State } from './state';
import { combineReducers, compose } from './utils';


export const INITIAL_REDUCER = new OpaqueToken('ngrx/store/reducer');
export const INITIAL_STATE = new OpaqueToken('ngrx/store/initial-state');


const dispatcherProvider = provide(Dispatcher, {
  useFactory() {
    return new Dispatcher();
  }
});

const storeProvider = provide(Store, {
  deps: [Dispatcher, Reducer, State, INITIAL_STATE],
  useFactory(dispatcher: Dispatcher, reducer: Reducer, state$: State<any>, initialState: any) {
      return new Store<any>(dispatcher, reducer, state$, initialState);
  }
});

const stateProvider = provide(State, {
  deps: [INITIAL_STATE, Dispatcher, Reducer],
  useFactory(initialState: any, dispatcher: Dispatcher, reducer: Reducer) {
    return new State(initialState, dispatcher, reducer);
  }
});

const reducerProvider = provide(Reducer, {
  deps: [ Dispatcher, INITIAL_REDUCER ],
  useFactory(dispatcher: Dispatcher, reducer: any) {
    return new Reducer(dispatcher, reducer);
  }
});

const storeProviderWithMiddleware = (middlewares?:any) => provide(Store, {
  deps: [Dispatcher, Reducer, State, INITIAL_STATE],
  useFactory(dispatcher: Dispatcher, reducer: Reducer, state$: State<any>, initialState: any) {

    
    let store = new Store<any>(dispatcher, reducer, state$, initialState);

    var middlewareAPI = {
      getState: () => {
        let state;
        store.subscribe(s => {
          state = s;
        }).unsubscribe();
        return state;
      },
      dispatch: (action) => {
        dispatcher.next(action);
      }
    }
    let chain = middlewares.map(middleware => middleware(middlewareAPI))
    let dispatch = compose(...chain)((action) => dispatcher.dispatch(action));

    store.dispatch = (action) => dispatch(action);
    store.next = (action) => dispatch(action);

    return store;

  }
});





export function provideStore(reducer: any, initialState?: any, middlewares?:any) {
  let providers = [
    provide(INITIAL_REDUCER, {
      useFactory() {
        if (typeof reducer === 'function') {
          return reducer;
        }

        return combineReducers(reducer);
      }
    }),
    provide(INITIAL_STATE, {
      deps: [ INITIAL_REDUCER ],
      useFactory(reducer) {
        if (initialState === undefined) {
          return reducer(undefined, { type: Dispatcher.INIT });
        }

        return initialState;
      }
    }),
    dispatcherProvider,
    stateProvider,
    reducerProvider
  ];

  if(middlewares){
    providers.push(storeProviderWithMiddleware(middlewares))
  }
  else {
    providers.push(storeProvider);
  }

  return providers;
}
