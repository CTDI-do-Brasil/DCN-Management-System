import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Mail,
  Clock,
  AlertTriangle,
  Calendar,
  UserCheck,
  Send,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Settings,
  Save,
  X,
  RefreshCw,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { api } from '../services/api';
import {
  NotificationLogEntry,
  NotificationRuleType,
  NotificationSettings,
  User
} from '../types';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DAY_OF_WEEK_LABELS,
  RULE_TYPE_LABELS,
  filterDCNsForRule,
  resolveRecipientsForDCNs,
  resolveCcRecipientsForDCNs,
  buildNotificationEmailHTML
} from '../utils/notificationTemplates';

interface NotificationsViewProps {
  onSelectDCN?: (dcnId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = () => {
  const { dcns } = useDCN();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<string>('ALL');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newDirectRecipientEmail, setNewDirectRecipientEmail] = useState('');
  const [smtpTargetEmail, setSmtpTargetEmail] = useState('');
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestFeedback, setSmtpTestFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Modal de pré-visualização de e-mail HTML
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subject: string;
    recipients: string[];
    ccRecipients?: string[];
    html: string;
    ruleType?: NotificationRuleType;
  } | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      const [loadedSettings, loadedUsers, loadedLogs] = await Promise.all([
        api.getNotificationSettings(),
        api.getUsers(),
        api.getNotificationLogs()
      ]);
      setSettings(loadedSettings);
      const firstReal = (loadedSettings.fixedRecipients || []).find(
        e => e !== 'engenharia@ctdi.com' && e !== 'qualidade@ctdi.com'
      );
      setSmtpTargetEmail(firstReal || loadedSettings.fixedRecipients?.[0] || '');
      setUsers(loadedUsers);
      setLogs(loadedLogs);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Lista única de responsáveis (das DCNs + usuários cadastrados)
  const responsiblesList = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => set.add(u.nome));
    dcns.forEach(d => {
      if (d.responsible) set.add(d.responsible);
    });
    return Array.from(set);
  }, [users, dcns]);

  // Contagens em tempo real para cada uma das 4 regras
  const ruleCounts = useMemo(() => {
    return {
      WEEKLY_PENDING: filterDCNsForRule(dcns, 'WEEKLY_PENDING', settings).length,
      DAILY_OVERDUE: filterDCNsForRule(dcns, 'DAILY_OVERDUE', settings).length,
      SLA_APPROACHING: filterDCNsForRule(dcns, 'SLA_APPROACHING', settings).length,
      RESPONSIBLE_ALERT: filterDCNsForRule(dcns, 'RESPONSIBLE_ALERT', settings, selectedResponsible).length
    };
  }, [dcns, settings, selectedResponsible]);

  const handleSaveSettings = async (updated: NotificationSettings = settings) => {
    setIsSaving(true);
    try {
      const saved = await api.saveNotificationSettings(updated);
      setSettings(saved);
      setFeedback({
        type: 'success',
        message: 'Configurações do serviço de notificações recorrentes salvas com sucesso!'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRecipientEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    if (settings.fixedRecipients.includes(clean)) {
      setNewRecipientEmail('');
      return;
    }
    const nextSettings: NotificationSettings = {
      ...settings,
      fixedRecipients: [...settings.fixedRecipients, clean]
    };
    setSettings(nextSettings);
    setNewRecipientEmail('');
    handleSaveSettings(nextSettings);
  };

  const handleRemoveRecipient = (email: string) => {
    const nextSettings: NotificationSettings = {
      ...settings,
      fixedRecipients: settings.fixedRecipients.filter(r => r !== email)
    };
    setSettings(nextSettings);
    handleSaveSettings(nextSettings);
  };

  const handleAddDirectRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDirectRecipientEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    const current = settings.directRecipients || [];
    if (current.includes(clean)) {
      setNewDirectRecipientEmail('');
      return;
    }
    const nextSettings: NotificationSettings = {
      ...settings,
      directRecipients: [...current, clean]
    };
    setSettings(nextSettings);
    setNewDirectRecipientEmail('');
    handleSaveSettings(nextSettings);
  };

  const handleRemoveDirectRecipient = (email: string) => {
    const nextSettings: NotificationSettings = {
      ...settings,
      directRecipients: (settings.directRecipients || []).filter(r => r !== email)
    };
    setSettings(nextSettings);
    handleSaveSettings(nextSettings);
  };

  const handlePreviewRule = (ruleType: NotificationRuleType) => {
    const targetResp = ruleType === 'RESPONSIBLE_ALERT' ? selectedResponsible : undefined;
    const targetDCNs = filterDCNsForRule(dcns, ruleType, settings, targetResp);
    const recipients = resolveRecipientsForDCNs(targetDCNs, users, settings, targetResp);
    const ccRecipients = resolveCcRecipientsForDCNs(settings, recipients);
    const { subject, html } = buildNotificationEmailHTML(ruleType, targetDCNs, settings, targetResp);

    setPreviewModal({
      title: RULE_TYPE_LABELS[ruleType].title,
      subject,
      recipients,
      ccRecipients,
      html,
      ruleType
    });
  };

  const handleTriggerRule = async (ruleType: NotificationRuleType) => {
    setIsTriggering(ruleType);
    try {
      const targetResp = ruleType === 'RESPONSIBLE_ALERT' ? selectedResponsible : undefined;
      const entry = await api.triggerNotification({
        ruleType,
        dcns,
        users,
        settings,
        triggerMode: 'MANUAL',
        targetResponsible: targetResp
      });
      setLogs(prev => [entry, ...prev.filter(l => l.id !== entry.id)]);
      setFeedback({
        type: 'success',
        message: `Notificação "${RULE_TYPE_LABELS[ruleType].title}" disparada para ${entry.recipients.length} destinatário(s)!`
      });
    } finally {
      setIsTriggering(null);
    }
  };

  const handleTriggerAllEnabled = async () => {
    setIsTriggering('ALL');
    try {
      const activeRules: NotificationRuleType[] = [];
      if (settings.weeklyPendingEnabled) activeRules.push('WEEKLY_PENDING');
      if (settings.dailyOverdueEnabled) activeRules.push('DAILY_OVERDUE');
      if (settings.slaApproachingEnabled) activeRules.push('SLA_APPROACHING');
      if (settings.responsibleAlertEnabled) activeRules.push('RESPONSIBLE_ALERT');

      const newEntries: NotificationLogEntry[] = [];
      for (const r of activeRules) {
        const entry = await api.triggerNotification({
          ruleType: r,
          dcns,
          users,
          settings,
          triggerMode: 'MANUAL',
          targetResponsible: r === 'RESPONSIBLE_ALERT' ? selectedResponsible : undefined
        });
        newEntries.push(entry);
      }
      setLogs(prev => [...newEntries, ...prev].slice(0, 100));
      setFeedback({
        type: 'success',
        message: `${newEntries.length} rotina(s) de notificação executada(s) e registrada(s) no histórico!`
      });
    } finally {
      setIsTriggering(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Serviço de Notificações Recorrentes
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Agendador Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automação de e-mails semanais de pendências, alertas diários de DCNs vencidas, aviso preventivo de SLA ({settings.slaThresholdDays} dias antes) e notificações aos responsáveis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSmtpConfig(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Configurar SMTP
          </button>

          <button
            type="button"
            onClick={handleTriggerAllEnabled}
            disabled={isTriggering !== null}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00386e] hover:bg-[#002b55] shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
            {isTriggering === 'ALL' ? 'Disparando Rotinas...' : 'Executar Todas as Rotinas Agora'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================
          OS 4 CARDS DAS REGRAS DE NOTIFICAÇÃO RECORRENTE
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. E-MAIL SEMANAL DE DCNs PENDENTES */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    1. E-mail Semanal de DCNs Pendentes
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Resumo consolidado de todas as DCNs abertas no fluxo de engenharia
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weeklyPendingEnabled}
                  onChange={e => {
                    const next = { ...settings, weeklyPendingEnabled: e.target.checked };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Dia do Envio Semanal
                </label>
                <select
                  value={settings.weeklyDayOfWeek}
                  onChange={e => {
                    const next = { ...settings, weeklyDayOfWeek: Number(e.target.value) };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  {Object.entries(DAY_OF_WEEK_LABELS).map(([dayNum, label]) => (
                    <option key={dayNum} value={dayNum}>
                      Toda {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Horário de Disparo
                </label>
                <input
                  type="time"
                  value={settings.weeklyTime}
                  onChange={e => {
                    const next = { ...settings, weeklyTime: e.target.value };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              DCNs pendentes hoje: <strong className="text-indigo-700">{ruleCounts.WEEKLY_PENDING}</strong>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePreviewRule('WEEKLY_PENDING')}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRule('WEEKLY_PENDING')}
                disabled={isTriggering !== null}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Disparar Agora
              </button>
            </div>
          </div>
        </div>

        {/* 2. E-MAIL DIÁRIO DE DCNs VENCIDAS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. E-mail Diário de DCNs Vencidas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cobrança diária de DCNs com prazo limite (SLA) ultrapassado
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailyOverdueEnabled}
                  onChange={e => {
                    const next = { ...settings, dailyOverdueEnabled: e.target.checked };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-rose-50/40 p-3 rounded-xl border border-rose-100 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Frequência
                </label>
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700">
                  Diariamente (Seg a Sex)
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Horário Diário
                </label>
                <input
                  type="time"
                  value={settings.dailyTime}
                  onChange={e => {
                    const next = { ...settings, dailyTime: e.target.value };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              DCNs vencidas hoje: <strong className="text-rose-600">{ruleCounts.DAILY_OVERDUE}</strong>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePreviewRule('DAILY_OVERDUE')}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRule('DAILY_OVERDUE')}
                disabled={isTriggering !== null}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Disparar Agora
              </button>
            </div>
          </div>
        </div>

        {/* 3. LEMBRETE DE SLA PRÓXIMO DO VENCIMENTO */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Lembrete de SLA Próximo do Vencimento
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Alerta preventivo antes do vencimento do prazo limite (SLA)
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.slaApproachingEnabled}
                  onChange={e => {
                    const next = { ...settings, slaApproachingEnabled: e.target.checked };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-100 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Gatilho de Antecedência (Dias)
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.slaThresholdDays}
                    onChange={e => {
                      const next = { ...settings, slaThresholdDays: Math.max(1, Number(e.target.value) || 5) };
                      setSettings(next);
                      handleSaveSettings(next);
                    }}
                    className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-amber-800"
                  />
                  <span className="text-xs font-semibold text-slate-600">dias antes do SLA</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Horário de Verificação
                </label>
                <input
                  type="time"
                  value={settings.slaTime}
                  onChange={e => {
                    const next = { ...settings, slaTime: e.target.value };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Próx. do vencimento (≤ {settings.slaThresholdDays}d):{' '}
              <strong className="text-amber-700">{ruleCounts.SLA_APPROACHING}</strong>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePreviewRule('SLA_APPROACHING')}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRule('SLA_APPROACHING')}
                disabled={isTriggering !== null}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Disparar Agora
              </button>
            </div>
          </div>
        </div>

        {/* 4. NOTIFICAÇÃO PARA RESPONSÁVEIS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    4. Notificação para Responsáveis
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Envio direcionado aos engenheiros responsáveis pelas DCNs ativas
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.responsibleAlertEnabled}
                  onChange={e => {
                    const next = { ...settings, responsibleAlertEnabled: e.target.checked };
                    setSettings(next);
                    handleSaveSettings(next);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="bg-cyan-50/40 p-3 rounded-xl border border-cyan-100 text-xs">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Filtrar Engenheiro Responsável para Cobrança / Notificação
              </label>
              <select
                value={selectedResponsible}
                onChange={e => setSelectedResponsible(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="ALL">Todos os Responsáveis com DCNs Ativas</option>
                {responsiblesList.map(resp => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              DCNs vinculadas: <strong className="text-cyan-700">{ruleCounts.RESPONSIBLE_ALERT}</strong>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePreviewRule('RESPONSIBLE_ALERT')}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRule('RESPONSIBLE_ALERT')}
                disabled={isTriggering !== null}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Notificar Responsável
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          DESTINATÁRIOS VINCULADOS (USUÁRIOS + LISTA FIXA CC/GESTÃO)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Destinatários Principais (Campo "Para:" / To) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00386e]" />
                Destinatários Principais (Campo "Para:" / To)
              </h3>
              <p className="text-[11px] text-slate-500">
                Engenheiros responsáveis e e-mails diretos que recebem como destinatário principal
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {(settings.directRecipients || []).length} no Para
            </span>
          </div>

          <form onSubmit={handleAddDirectRecipient} className="flex gap-2">
            <input
              type="email"
              placeholder="Adicionar e-mail direto no 'Para:' (mesmo sem usuário)..."
              value={newDirectRecipientEmail}
              onChange={e => setNewDirectRecipientEmail(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#00386e]"
            />
            <button
              type="submit"
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#00386e] hover:bg-[#002b55] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar
            </button>
          </form>

          {/* Chips de e-mails diretos adicionados */}
          {(settings.directRecipients || []).length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {settings.directRecipients!.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                >
                  <Mail className="w-3 h-3 mr-1.5 text-sky-600" />
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveDirectRecipient(email)}
                    className="ml-2 text-sky-400 hover:text-rose-600 cursor-pointer"
                    title="Remover destinatário direto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic pt-1">
              Nenhum e-mail direto adicional fixado. Os disparos serão encaminhados automaticamente aos engenheiros responsáveis de cada DCN.
            </p>
          )}
        </div>

        {/* Lista de Destinatários em Cópia (Campo "Cc:" / Cópia) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" />
                Lista de Destinatários em Cópia (Campo "Cc:" / Cópia)
              </h3>
              <p className="text-[11px] text-slate-500">
                Estes e-mails recebem cópia (Cc:) de todos os relatórios e alertas de SLA
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {settings.fixedRecipients.length} no Cc
            </span>
          </div>

          <form onSubmit={handleAddRecipient} className="flex gap-2">
            <input
              type="email"
              placeholder="Adicionar e-mail em cópia (ex: gestao.engenharia@ctdi.com)..."
              value={newRecipientEmail}
              onChange={e => setNewRecipientEmail(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-1">
            {settings.fixedRecipients.map(email => (
              <span
                key={email}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200"
              >
                <Mail className="w-3 h-3 mr-1.5 text-indigo-600" />
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email)}
                  className="ml-2 text-indigo-400 hover:text-rose-600 cursor-pointer"
                  title="Remover destinatário em cópia"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Servidor SMTP */}
      {showSmtpConfig && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#002a54] to-[#00386e] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    Configuração do Servidor de E-mail (SMTP)
                  </h2>
                  <p className="text-[11px] text-cyan-200">
                    Parâmetros de conexão para envio automático dos alertas de DCN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpConfig(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Habilitar Disparo Externo via Servidor SMTP</p>
                  <p className="text-[11px] text-slate-500">
                    Quando ativo, envia os relatórios diretamente para a caixa de entrada dos destinatários
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smtpEnabled}
                    onChange={e => setSettings({ ...settings, smtpEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">
                  Guia Rápido CapRover / Poste.io (<code className="text-indigo-700">mail.ctdibrasil.com.br</code>):
                </p>
                <p>
                  • <strong>Host SMTP:</strong> Use <code className="font-mono bg-white px-1 rounded border">mail.ctdibrasil.com.br</code> (ou o nome interno do container no CapRover, ex: <code className="font-mono bg-white px-1 rounded border">srv-captain--mailserver</code>).
                </p>
                <p>
                  • <strong>Porta:</strong> <code className="font-mono bg-white px-1 rounded border">587</code> (STARTTLS) ou <code className="font-mono bg-white px-1 rounded border">25</code> (comunicação interna entre containers no CapRover).
                </p>
              </div>

              {smtpTestFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    smtpTestFeedback.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span>{smtpTestFeedback.msg}</span>
                  <button
                    type="button"
                    onClick={() => setSmtpTestFeedback(null)}
                    className="ml-2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Host / Servidor SMTP *</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="mail.ctdibrasil.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Porta SMTP *</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={e => setSettings({ ...settings, smtpPort: Number(e.target.value) || 587 })}
                    placeholder="587"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuário / E-mail da Conta (Poste.io)</label>
                  <input
                    type="text"
                    value={settings.smtpUser}
                    onChange={e => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="Ex: dcn@ctdibrasil.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senha da Conta de E-mail</label>
                  <input
                    type="password"
                    value={settings.smtpPass || ''}
                    onChange={e => setSettings({ ...settings, smtpPass: e.target.value })}
                    placeholder="Senha criada no painel do Poste.io"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome e E-mail do Remetente (From)</label>
                <input
                  type="text"
                  value={settings.smtpFrom}
                  onChange={e => setSettings({ ...settings, smtpFrom: e.target.value })}
                  placeholder="Gestão de DCNs CTDI <dcnmanagementsystem@ctdibrasil.com.br>"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                />
              </div>

              <div className="p-3.5 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-[#00386e]">
                  E-mail Destinatário (Para qual e-mail enviar o teste e os alertas) *
                </label>
                <input
                  type="email"
                  value={smtpTargetEmail}
                  onChange={e => setSmtpTargetEmail(e.target.value)}
                  placeholder="Digite o seu e-mail (ex: jmiranda@ctdibrasil.com.br)"
                  className="w-full px-3 py-2 border border-cyan-300 rounded-xl bg-white font-semibold text-slate-900 focus:outline-none focus:border-[#00386e]"
                />
                <p className="text-[11px] text-slate-500">
                  O e-mail de teste e os relatórios de DCN serão enviados para este endereço.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isTestingSmtp}
                  onClick={async () => {
                    const cleanTarget = smtpTargetEmail.trim().toLowerCase();
                    if (!cleanTarget || !cleanTarget.includes('@')) {
                      setSmtpTestFeedback({
                        ok: false,
                        msg: 'Por favor, informe um E-mail Destinatário válido no campo acima antes de testar.'
                      });
                      return;
                    }
                    setIsTestingSmtp(true);
                    setSmtpTestFeedback(null);
                    try {
                      const updatedRecipients = [
                        cleanTarget,
                        ...settings.fixedRecipients.filter(
                          r => r !== cleanTarget && r !== 'engenharia@ctdi.com' && r !== 'qualidade@ctdi.com'
                        )
                      ];
                      const nextSettings = { ...settings, fixedRecipients: updatedRecipients };
                      setSettings(nextSettings);
                      const res = await api.testSmtpConnection(nextSettings, cleanTarget, dcns);
                      setSmtpTestFeedback({ ok: true, msg: res.message });
                    } catch (err: any) {
                      setSmtpTestFeedback({
                        ok: false,
                        msg: err.message || 'Não foi possível conectar ao servidor SMTP.'
                      });
                    } finally {
                      setIsTestingSmtp(false);
                    }
                  }}
                  className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isTestingSmtp ? 'Testando Conexão...' : 'Testar Conexão & Enviar E-mail'}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSmtpConfig(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const cleanTarget = smtpTargetEmail.trim().toLowerCase();
                      const updatedRecipients =
                        cleanTarget && cleanTarget.includes('@')
                          ? [
                              cleanTarget,
                              ...settings.fixedRecipients.filter(
                                r => r !== cleanTarget && r !== 'engenharia@ctdi.com' && r !== 'qualidade@ctdi.com'
                              )
                            ]
                          : settings.fixedRecipients;
                      const nextSettings = { ...settings, fixedRecipients: updatedRecipients };
                      setSettings(nextSettings);
                      await handleSaveSettings(nextSettings);
                      setShowSmtpConfig(false);
                    }}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00386e] hover:bg-[#002b55] shadow-sm cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
                    Salvar Configurações SMTP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          HISTÓRICO DE NOTIFICAÇÕES DISPARADAS (OUTBOX / LOG)
          ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Histórico de Notificações & E-mails Disparados ({logs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Registro auditável de todos os envios automáticos e manuais
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Nenhum disparo registrado ainda.</p>
            <p className="mt-0.5">
              Clique em "Disparar Agora" em qualquer uma das 4 regras acima para gerar e testar o envio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Regra / Tipo</th>
                  <th className="py-3 px-4">Assunto</th>
                  <th className="py-3 px-4">Destinatários</th>
                  <th className="py-3 px-4">DCNs</th>
                  <th className="py-3 px-4 text-right">Visualizar E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {log.timestamp}
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        {log.triggerMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.title}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="font-mono text-[11px]">
                        {log.recipients.slice(0, 2).join(', ')}
                        {log.recipients.length > 2 ? ` +${log.recipients.length - 2}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.dcnCount} DCN(s)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handlePreviewRule(log.ruleType)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver E-mail HTML
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL DE PRÉ-VISUALIZAÇÃO DO E-MAIL HTML
          ============================================================ */}
      {previewModal && (() => {
        const activeRule = previewModal.ruleType || 'WEEKLY_PENDING';
        const targetResp = activeRule === 'RESPONSIBLE_ALERT' ? selectedResponsible : undefined;
        const liveDCNs = filterDCNsForRule(dcns, activeRule, settings, targetResp);
        const liveBuilt = buildNotificationEmailHTML(activeRule, liveDCNs, settings, targetResp);
        const liveTo = resolveRecipientsForDCNs(liveDCNs, users, settings, targetResp);
        const liveCc = resolveCcRecipientsForDCNs(settings, liveTo);
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Pré-visualização de E-mail Corporativo
                  </span>
                  <h3 className="text-sm sm:text-base font-bold">{previewModal.title}</h3>
                </div>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs space-y-1">
                <div>
                  <span className="font-bold text-slate-600">Assunto:</span>{' '}
                  <span className="font-semibold text-slate-900">{liveBuilt.subject}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-bold text-slate-600">Para ({liveTo.length}):</span>
                  {liveTo.map(r => (
                    <span
                      key={r}
                      className="px-2 py-0.2 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                {liveCc.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-bold text-slate-600">Cc ({liveCc.length}):</span>
                    {liveCc.map(r => (
                      <span
                        key={r}
                        className="px-2 py-0.2 rounded bg-indigo-50 border border-indigo-200 font-mono text-[11px] text-indigo-700"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 overflow-y-auto flex-1 bg-slate-100/70">
                <div dangerouslySetInnerHTML={{ __html: liveBuilt.html }} />
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Fechar
                </button>
                {previewModal.ruleType && (
                  <button
                    type="button"
                    onClick={() => {
                      const rule = previewModal.ruleType!;
                      setPreviewModal(null);
                      handleTriggerRule(rule);
                    }}
                    className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar e Disparar E-mail Agora
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
