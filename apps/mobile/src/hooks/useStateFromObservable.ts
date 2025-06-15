import {useState, useEffect} from 'react';
import {Observable} from 'rxjs';

export function useStateFromObservable<T>(observable: Observable<T>): T | null {
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe(value => {
      setState(value);
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  return state;
}
