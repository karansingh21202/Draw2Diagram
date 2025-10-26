import { useState, useCallback } from 'react';

type State<S> = {
  history: S[];
  index: number;
};

type SetStateAction<S> = S | ((prevState: S) => S);
type HistorySetter<S> = (action: SetStateAction<S>, overwrite?: boolean) => void;

export const useHistoryState = <S>(initialState: S): [S, HistorySetter<S>, () => void, () => void, boolean, boolean] => {
  const [state, setStateInternal] = useState<State<S>>({
    history: [initialState],
    index: 0,
  });

  const setState: HistorySetter<S> = useCallback((action, overwrite = false) => {
    setStateInternal(prevState => {
      const currentState = prevState.history[prevState.index];
      const newState = typeof action === 'function'
        ? (action as (prevState: S) => S)(currentState)
        : action;

      if (overwrite) {
        const newHistory = [...prevState.history];
        newHistory[prevState.index] = newState;
        return { ...prevState, history: newHistory };
      } else {
        const newHistory = prevState.history.slice(0, prevState.index + 1);
        newHistory.push(newState);
        return { history: newHistory, index: newHistory.length - 1 };
      }
    });
  }, []); // Empty dependency array is safe due to functional updates

  const undo = useCallback(() => {
    setStateInternal(prevState => {
      if (prevState.index > 0) {
        return { ...prevState, index: prevState.index - 1 };
      }
      return prevState;
    });
  }, []);

  const redo = useCallback(() => {
    setStateInternal(prevState => {
      if (prevState.index < prevState.history.length - 1) {
        return { ...prevState, index: prevState.index + 1 };
      }
      return prevState;
    });
  }, []);

  const canUndo = state.index > 0;
  const canRedo = state.index < state.history.length - 1;

  const currentState = state.history[state.index];

  return [currentState, setState, undo, redo, canUndo, canRedo];
};
