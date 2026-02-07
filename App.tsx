
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientFormPage from './pages/PatientFormPage';
import AIResultPage from './pages/AIResultPage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage';
import RagChatbotPage from './pages/RagChatbotPage';
import InventoryPage from './pages/InventoryPage';
import ComparativeAnalysisPage from './pages/ComparativeAnalysisPage';
import TranslationPage from './pages/TranslationPage';
import Layout from './components/Layout';
import PublicPatientFormPage from './pages/PublicPatientFormPage';
import PublicAIResultPage from './pages/PublicAIResultPage';
import RegisterPage from './pages/RegisterPage';
import OfflineSharePage from './pages/OfflineSharePage';
import AIReportViewPage from './pages/AIReportViewPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  if (!auth?.user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReportProvider>
          <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </div>
        </ReportProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const AppRoutes: React.FC = () => {
  const auth = useAuth();

  return (
    <Routes>
      <Route path="/" element={!auth?.user ? <LoginPage /> : <Navigate to="/dashboard" />} />

      <Route path="/register-case" element={<PublicPatientFormPage />} />
      <Route path="/public-result" element={<PublicAIResultPage />} />
      <Route path="/register/:role" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-patient"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-result"
        element={
          <ProtectedRoute>
            <Layout>
              <AIResultPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:reportId"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <Layout>
              <RagChatbotPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout>
              <InventoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <Layout>
              <ComparativeAnalysisPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/translate"
        element={
          <ProtectedRoute>
            <Layout>
              <TranslationPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer"
        element={
          <ProtectedRoute>
            <Layout>
              <OfflineSharePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-report/:reportId"
        element={
          <ProtectedRoute>
            <Layout>
              <AIReportViewPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={auth?.user ? "/dashboard" : "/"} />} />
    </Routes>
  );
}

export default App;