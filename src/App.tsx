import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DCNProvider, useDCN } from './context/DCNContext';
import { Sidebar, AppNavTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { Dashboard } from './components/Dashboard';
import { DCNManagement } from './components/DCNManagement';
import { DCNDetailModal } from './components/DCNDetailModal';
import { NewDCNModal } from './components/NewDCNModal';
import { AuditReportModal } from './components/AuditReportModal';
import { MaterialsOverview } from './components/MaterialsOverview';
import { TrainingMatrix } from './components/TrainingMatrix';
import { TechniciansView } from './components/TechniciansView';
import { UsersManagementView } from './components/UsersManagementView';
import { NotificationsView } from './components/NotificationsView';
import { SearchExportView } from './components/SearchExportView';
import { LoginModal } from './components/LoginModal';

function AppContent() {
  const { dcns, selectedDCN, setSelectedDCN, setFilters } = useDCN();
  const { isAuthenticated, canAccessAudit, canCreateDCN } = useAuth();
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewDCNModalOpen, setIsNewDCNModalOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [auditDCNId, setAuditDCNId] = useState<string | null>(null);

  const handleSelectDCN = (id: string) => {
    const found = dcns.find(d => d.id === id);
    if (found) {
      setSelectedDCN(found);
    }
  };

  const handleNavigateToDCNs = (statusFilter?: string) => {
    if (statusFilter && statusFilter !== 'ALL') {
      setFilters(prev => ({
        ...prev,
        status: statusFilter,
        overdueOnly: false
      }));
    }
    setActiveTab('dcns');
  };

  const handleOpenAuditReportForDCN = (dcnId: string) => {
    setAuditDCNId(dcnId);
    setIsAuditReportOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900 flex font-sans selection:bg-[#00a8e8] selection:text-white">
      
      {/* 1. Left Fixed Enterprise Sidebar (Matching Reference Image) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewDCN={() => setIsNewDCNModalOpen(true)}
        onOpenAuditReport={() => {
          setAuditDCNId(dcns[0]?.id || null);
          setIsAuditReportOpen(true);
        }}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Area with Sticky Top Navbar */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        
        {/* Sticky Header Topbar */}
        <TopNavbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          activeTab={activeTab}
          onOpenNewDCN={() => setIsNewDCNModalOpen(true)}
          onOpenAuditReport={() => {
            setAuditDCNId(dcns[0]?.id || null);
            setIsAuditReportOpen(true);
          }}
          onNavigateToTab={setActiveTab}
          onSelectDCN={handleSelectDCN}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Tab 1: Início (Home view with Guidelines + Hero Scanner Center + Pipeline + Metrics) */}
          {activeTab === 'dashboard' && (
            <Dashboard
              onSelectDCN={handleSelectDCN}
              onNavigateToDCNs={handleNavigateToDCNs}
              onOpenNewDCN={() => setIsNewDCNModalOpen(true)}
              onOpenAuditReport={() => {
                setAuditDCNId(dcns[0]?.id || null);
                setIsAuditReportOpen(true);
              }}
              onNavigateToTab={setActiveTab}
              isMetricsOnly={false}
            />
          )}

          {/* Tab 2: Gestão de DCNs (Grid & Kanban Table) */}
          {activeTab === 'dcns' && (
            <DCNManagement
              onSelectDCN={handleSelectDCN}
              onOpenNewDCN={() => setIsNewDCNModalOpen(true)}
            />
          )}

          {/* Tab 3: Controle de Materiais */}
          {activeTab === 'materials' && (
            <MaterialsOverview
              onSelectDCN={handleSelectDCN}
            />
          )}

          {/* Tab 4: Matriz de Treinamentos */}
          {activeTab === 'trainings' && (
            <TrainingMatrix
              onSelectDCN={handleSelectDCN}
              onNavigateToTechnicians={() => setActiveTab('technicians')}
            />
          )}

          {/* Tab 5: Cadastro de Técnicos */}
          {activeTab === 'technicians' && (
            <TechniciansView
              onSelectDCN={handleSelectDCN}
            />
          )}

          {/* Tab 5.1: Gestão de Usuários & Acessos (RBAC - Admin) */}
          {activeTab === 'users' && (
            <UsersManagementView />
          )}

          {/* Tab 5.2: Serviço de Notificações Recorrentes */}
          {activeTab === 'notifications' && (
            <NotificationsView onSelectDCN={handleSelectDCN} />
          )}

          {/* Tab 6: Métricas & Dashboard (Deep Analytics) */}
          {activeTab === 'metrics' && (
            <Dashboard
              onSelectDCN={handleSelectDCN}
              onNavigateToDCNs={handleNavigateToDCNs}
              onOpenNewDCN={() => setIsNewDCNModalOpen(true)}
              onOpenAuditReport={() => {
                setAuditDCNId(dcns[0]?.id || null);
                setIsAuditReportOpen(true);
              }}
              onNavigateToTab={setActiveTab}
              isMetricsOnly={true}
            />
          )}

          {/* Tab 7: Consulta & Exportação */}
          {activeTab === 'search' && (
            <SearchExportView
              onSelectDCN={handleSelectDCN}
              onOpenAuditReport={handleOpenAuditReportForDCN}
            />
          )}

        </main>

        {/* Corporate Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#00386e]">GESTÃO DE DCNs • CTDI</span>
              <span>•</span>
              <span>Document Change Notice Management System</span>
            </div>
            <div>
              <span>ISO 9001:2015 & IATF 16949 Compliant • Engenharia de Processos</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Detail Modal */}
      {selectedDCN && (
        <DCNDetailModal
          dcn={selectedDCN}
          onClose={() => setSelectedDCN(null)}
          onOpenAuditReport={handleOpenAuditReportForDCN}
        />
      )}

      {/* New DCN Modal */}
      {isNewDCNModalOpen && (
        <NewDCNModal
          onClose={() => setIsNewDCNModalOpen(false)}
          onSuccess={(newId) => {
            setIsNewDCNModalOpen(false);
            handleSelectDCN(newId);
          }}
        />
      )}

      {/* Audit Dossier Modal */}
      {isAuditReportOpen && (
        <AuditReportModal
          initialDCNId={auditDCNId}
          onClose={() => setIsAuditReportOpen(false)}
        />
      )}

      {/* Modal de Login Corporativo com Overlay (Estilo OLP_WEB) */}
      <LoginModal />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DCNProvider>
        <AppContent />
      </DCNProvider>
    </AuthProvider>
  );
}

