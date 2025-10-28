// src/components/PrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
