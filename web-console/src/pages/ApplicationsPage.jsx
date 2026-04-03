import { useState, useEffect } from 'react';
import { useNavigate as useNavigateHook, useSearchParams } from 'react-router-dom';
import { Shield, Plus, Folder, Calendar, Activity, ExternalLink, Edit2, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Card, Button } from '../components/design-system';
import CreateApplicationModal from '../components/CreateApplicationModal';
import EditProjectModal from '../components/EditProjectModal';
import Sidebar from '../components/Sidebar';
import apiClient from '../api/client';

/**
 * ApplicationsPage - Main page for displaying and managing AI agents
 *
 * @param {Object} props
 * @param {Function} props.onSelectApplication - Callback when an agent is selected
 * @param {Function} props.onNavigate - Callback for navigation
 * @param {Function} props.onLogout - Callback for logout action
 * @returns {JSX.Element}
 */

const ApplicationsPage = ({ onSelectApplication, onNavigate, onLogout }) => {
  const navigate = useNavigateHook();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingSpec, setPendingSpec] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

  useEffect(() => {
    loadAgents();

    // Check for URL action param (from login redirect)
    const action = searchParams.get('action');

    if (action === 'createAgent') {
      // Check for pending trial spec in localStorage
      const pendingTrialSpec = localStorage.getItem('pendingTrialSpec');
      if (pendingTrialSpec) {
        try {
          const specData = JSON.parse(pendingTrialSpec);
          setPendingSpec(specData);
          setIsModalOpen(true);
          // Clear localStorage
          localStorage.removeItem('pendingTrialSpec');
        } catch (err) {
          console.error('Failed to parse pending spec:', err);
          localStorage.removeItem('pendingTrialSpec');
        }
      }

      // Clean up URL params
      navigate('/agents', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAgents();
      if (response.success) {
        const transformedAgents = response.data.map(agent => ({
          ...agent,
          endpointsCount: agent.endpoints?.length || 0
        }));
        setApplications(transformedAgents);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractEndpointsFromSchema = (schemaSpec) => {
    if (!schemaSpec || !schemaSpec.paths) return [];

    const endpoints = [];
    Object.keys(schemaSpec.paths).forEach((path) => {
      Object.keys(schemaSpec.paths[path]).forEach((method) => {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: schemaSpec.paths[path][method].summary || '',
          });
        }
      });
    });
    return endpoints;
  };

  const handleCreateApp = async (appData) => {
    try {
      setError(null);

      if (appData.mode === 'auto-sync') {
        const agentResponse = await apiClient.createAgent(
          appData.name,
          null,
          null,
          appData.schemaSourceUrl,
          appData.schemaSyncInterval
        );

        if (!agentResponse.success) {
          throw new Error(agentResponse.error || 'Failed to create agent');
        }
      } else {
        const agentResponse = await apiClient.createAgent(
          appData.name,
          null
        );

        if (!agentResponse.success) {
          throw new Error(agentResponse.error || 'Failed to create agent');
        }

        const agent = agentResponse.data;

        if (appData.spec) {
          await apiClient.uploadSchema(agent.id, appData.spec, appData.version);
        }
      }

      await loadAgents();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleEditAgent = async (agentId, updateData, schemaFile, schemaMode) => {
    try {
      setError(null);

      if (Object.keys(updateData).length > 0) {
        const updateResponse = await apiClient.updateAgent(agentId, updateData);
        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to update agent');
        }
      }

      if (schemaMode === 'upload' && schemaFile) {
        await apiClient.uploadSchema(agentId, schemaFile, schemaFile.info?.version || '1.0.0');
      }

      await loadAgents();
      setIsEditModalOpen(false);
      setSelectedAgent(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const openEditModal = (e, agent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  const handleDeleteAgent = async (e, agent) => {
    e.stopPropagation();

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${agent.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      const response = await apiClient.deleteAgent(agent.id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete agent');
      }

      // Reload agents list
      await loadAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex">
      <Sidebar activeView="applications" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 ml-[200px] px-9 py-8">
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="font-serif text-[26px] font-normal text-on-surface mb-1">My Agents</h1>
            <p className="text-[13px] text-muted">
              Manage your AI agents and monitor their security status
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-[18px] py-[9px] bg-green text-white font-semibold text-[13px] rounded-[8px] hover:opacity-88 transition-opacity whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Agent
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-[8px] text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-on-surface-variant">Loading agents...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex items-center justify-center py-[60px] px-10">
            <div className="max-w-[520px] w-full text-center">

              {/* Plus Icon */}
              <div className="flex items-center justify-center mb-9">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-20 h-20 text-green"
                >
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>

              {/* Eyebrow Label */}
              <div className="font-mono text-[10px] text-green uppercase tracking-[0.14em] mb-[14px]">
                Invari Lab
              </div>

              {/* Title */}
              <h1 className="font-serif text-[28px] leading-[1.2] mb-[10px]">
                Your first agent is one<br/>click away.
              </h1>

              {/* Description */}
              <p className="text-[14px] text-muted leading-[1.75] max-w-[400px] mx-auto mb-7">
                Connect an API, upload your OpenAPI spec, and invari starts intercepting, repairing, and protecting every request your AI agent makes.
              </p>

              {/* Button - Keeping green color as requested */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-[10px] px-7 py-[13px] bg-green text-white font-bold text-[14px] rounded-[10px] shadow-md hover:bg-[#2a2b29] hover:-translate-y-px hover:shadow-lg transition-all duration-150"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  className="w-4 h-4"
                >
                  <path d="M10 4v12M4 10h12"/>
                </svg>
                Create your first agent
              </button>

              {/* Hint Text */}
              <p className="mt-4 text-[12px] text-muted">
                Already have an agent?{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // Could open help modal or documentation
                  }}
                  className="text-green font-medium no-underline hover:underline"
                >
                  See how to test →
                </a>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-5">
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex gap-[2px] bg-surface-mid p-[3px] rounded-[7px]">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`w-[30px] h-[28px] flex items-center justify-center rounded-[5px] transition-all ${
                      viewMode === 'card'
                        ? 'bg-surface-container-lowest text-on-surface shadow-subtle'
                        : 'text-muted hover:text-on-surface'
                    }`}
                    title="Card view"
                    aria-label="Switch to card view"
                  >
                    <LayoutGrid className="w-[14px] h-[14px]" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`w-[30px] h-[28px] flex items-center justify-center rounded-[5px] transition-all ${
                      viewMode === 'list'
                        ? 'bg-surface-container-lowest text-on-surface shadow-subtle'
                        : 'text-muted hover:text-on-surface'
                    }`}
                    title="List view"
                    aria-label="Switch to list view"
                  >
                    <List className="w-[14px] h-[14px]" />
                  </button>
                </div>
              </div>

              {/* Agent Count */}
              <span className="font-mono text-[11px] text-muted">
                {applications.length} {applications.length === 1 ? 'agent' : 'agents'}
              </span>
            </div>

            {/* Conditional rendering based on viewMode */}
            {viewMode === 'card' ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => {
                  return (
                    <div
                      key={app.id}
                      className="bg-surface-container-lowest border border-outline rounded-3xl overflow-hidden cursor-pointer group transition-all duration-150 hover:border-green hover:shadow-card-hover"
                      onClick={() => {
                        onSelectApplication(app);
                      }}
                    >
                      {/* Card Top Section */}
                      <div className="px-4 pt-4 pb-3 relative">
                        {/* Card Actions - Hidden by default, shown on hover */}
                        <div className="absolute top-[14px] right-[14px] flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => openEditModal(e, app)}
                            className="w-7 h-7 flex items-center justify-center bg-surface-container-low hover:bg-surface-high rounded-md transition-all"
                            title="Edit agent"
                            aria-label={`Edit ${app.name} agent`}
                          >
                            <Edit2 className="w-[13px] h-[13px] text-muted hover:text-on-surface" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteAgent(e, app)}
                            className="w-7 h-7 flex items-center justify-center bg-surface-container-low hover:bg-red-50 rounded-md transition-all"
                            title="Delete agent"
                            aria-label={`Delete ${app.name} agent`}
                          >
                            <Trash2 className="w-[13px] h-[13px] text-muted hover:text-red-600" />
                          </button>
                        </div>

                        {/* Agent Name */}
                        <h3 className="text-[15px] font-semibold text-on-surface mb-1 pr-[60px] leading-[1.3]">
                          {app.name}
                        </h3>

                        {/* Description */}
                        <p className="text-[12px] text-muted mb-[14px] min-h-[16px]">
                          {app.description || 'No description provided'}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-col gap-[5px]">
                          <div className="flex items-center gap-[6px] font-mono text-[11px] text-muted">
                            <Activity className="w-3 h-3 flex-shrink-0" />
                            <span>{app.endpointsCount} endpoints</span>
                          </div>
                          <div className="flex items-center gap-[6px] font-mono text-[11px] text-muted">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>Created {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Section */}
                      <div className="px-4 py-[10px] bg-surface-container-low border-t border-surface-mid flex items-center gap-[6px]">
                        <div className="w-[7px] h-[7px] rounded-full bg-green flex-shrink-0"></div>
                        <span className="text-[12px] font-semibold text-green">Active</span>
                        {/* <span className="ml-auto font-mono text-[11px] text-muted">
                          {Math.floor(Math.random() * 1000)}+ requests
                        </span> */}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline">
                {/* Table Header */}
                <div className="bg-surface-container-low px-6 py-4 grid grid-cols-12 gap-4 text-[10px] font-semibold text-muted font-mono uppercase tracking-[0.08em]">
                  <div className="col-span-4">Agent Name</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Endpoints</div>
                  <div className="col-span-3">Created</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y-0">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => {
                        onSelectApplication(app);
                      }}
                      className="px-6 py-4 grid grid-cols-12 gap-4 items-center cursor-pointer hover:bg-surface-high transition-quick group"
                    >
                      {/* Agent Name with Icon */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-surface-container-low rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-green transition-colors">
                          <Shield className="w-4 h-4 text-on-surface group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[14px] font-medium text-on-surface group-hover:text-green transition-colors truncate">
                          {app.name}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-green/10 rounded-xs">
                          <div className="w-2 h-2 rounded-full bg-green"></div>
                          <span className="text-[11px] text-green font-mono">Active</span>
                        </div>
                      </div>

                      {/* Endpoints Count */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          <Activity className="w-3 h-3" />
                          <span className="font-mono">{app.endpointsCount}</span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          <Calendar className="w-3 h-3" />
                          <span className="font-mono">{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end gap-1">
                        <button
                          onClick={(e) => openEditModal(e, app)}
                          className="p-2 hover:bg-surface-container-highest rounded-md transition-colors"
                          title="Edit agent"
                          aria-label={`Edit ${app.name} agent`}
                        >
                          <Edit2 className="w-4 h-4 text-muted hover:text-on-surface transition-colors" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAgent(e, app)}
                          className="p-2 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete agent"
                          aria-label={`Delete ${app.name} agent`}
                        >
                          <Trash2 className="w-4 h-4 text-muted hover:text-red-600 transition-colors" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {isModalOpen && (
          <CreateApplicationModal
            onClose={() => {
              setIsModalOpen(false);
              setPendingSpec(null);
            }}
            onCreate={handleCreateApp}
            initialSpec={pendingSpec}
          />
        )}

        {isEditModalOpen && selectedAgent && (
          <EditProjectModal
            project={selectedAgent}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedAgent(null);
            }}
            onUpdate={handleEditAgent}
          />
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
