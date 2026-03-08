import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, state } = useLocation();
  const action = useNavigationType();

  useEffect(() => {
    // If the user is navigating back (e.g. closing a modal), let the browser natively restore scroll
    if (action === 'POP') {
      return;
    }

    // If explicit preventScroll is passed or we're opening a modal via backgroundLocation
    if (state && (state.preventScroll || state.backgroundLocation)) {
      return;
    }
    
    window.scrollTo(0, 0);
  }, [pathname, state, action]);

  return null;
}
