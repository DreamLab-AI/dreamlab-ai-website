import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "404 — Page not found | DreamLab AI";

    if (import.meta.env.DEV) {
      console.warn(
        "404: route not found",
        location.pathname
      );
    }

    return () => {
      document.title = previousTitle;
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="text-center max-w-lg">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">404</h1>
        <p className="text-xl text-gray-700 mb-2">This page could not be found.</p>
        <p className="text-sm text-gray-500 mb-8 break-all">
          <code>{location.pathname}</code> is not a known route.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Go to homepage
          </Link>
          <Link
            to="/workshops"
            className="inline-block px-6 py-3 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
          >
            Browse workshops
          </Link>
          <Link
            to="/contact"
            className="inline-block px-6 py-3 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
