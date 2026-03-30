import { useState, useEffect } from 'react';
import { useNavigate as useNavigateHook, useSearchParams } from 'react-router-dom';
import { Shield, Plus, Folder, Calendar, Activity, ExternalLink, Edit2, LayoutGrid, List } from 'lucide-react';
import { Card, Button } from '../components/design-system';
import CreateApplicationModal from '../components/CreateApplicationModal';
import EditProjectModal from '../components/EditProjectModal';
import Sidebar from '../components/Sidebar';
import apiClient from '../api/client';

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

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex">
      <Sidebar activeView="applications" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 ml-60 p-6">
        <div className="mb-8">
          <h1 className="text-display-sm font-bold text-on-surface mb-2">My Agents</h1>
          <p className="text-on-surface-variant text-body-md">
            Manage your AI agents and monitor their security status
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-on-surface-variant">Loading agents...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-surface-container-low rounded-md flex items-center justify-center mb-8"> {/* Removed border, added more spacing */}
              <Folder className="w-10 h-10 text-on-surface-variant" />
            </div>
            <h2 className="text-heading-md font-semibold text-on-surface mb-2">No agents yet</h2>
            <p className="text-on-surface-variant text-body-md mb-8 text-center max-w-md">
              Get started by creating your first agent and uploading your API specification
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Create Your First Agent
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-sm transition-all ${
                    viewMode === 'card'
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-sm transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* New Agent Button */}
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                New Agent
              </Button>
            </div>

            {/* Conditional rendering based on viewMode */}
            {viewMode === 'card' ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => (
                  <Card
                    key={app.id}
                    variant="outlined"
                    hover={true}
                    className="p-6 cursor-pointer group transition-all duration-150"
                    onClick={() => {
                      console.log('Card clicked!', app);
                      onSelectApplication(app);
                    }}
                  >
                    <div className="flex items-start justify-end mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => openEditModal(e, app)}
                          className="p-2 hover:bg-surface-container-high rounded-sm transition-colors"
                          title="Edit agent"
                        >
                          <Edit2 className="w-4 h-4 text-on-surface-variant hover:text-on-surface transition-colors" />
                        </button>
                        <ExternalLink className="w-4 h-4 text-on-surface-variant group-hover:text-on-surface transition-colors" />
                      </div>
                    </div>

                    <h3 className="text-body-lg font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors">
                      {app.name}
                    </h3>

                    <p className="text-body-sm text-on-surface-variant mb-4 line-clamp-2">
                      {app.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-label-md text-on-surface-variant font-mono">
                        <Activity className="w-3 h-3" />
                        <span>{app.endpointsCount} endpoints</span>
                      </div>
                      <div className="flex items-center gap-2 text-label-md text-on-surface-variant font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>Created {new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 bg-surface-container-low -mx-6 px-6 -mb-6 pb-4 rounded-b-md">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="text-label-sm text-on-surface-variant">Active</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-surface-container-lowest rounded-md overflow-hidden">
                {/* Table Header */}
                <div className="bg-surface-container-low px-6 py-4 grid grid-cols-12 gap-4 text-label-md font-medium text-on-surface-variant">
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
                        console.log('Row clicked!', app);
                        onSelectApplication(app);
                      }}
                      className="px-6 py-4 grid grid-cols-12 gap-4 items-center cursor-pointer hover:bg-surface-container-high transition-colors group"
                    >
                      {/* Agent Name with Icon */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-surface-container-low rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                          <Shield className="w-4 h-4 text-on-surface group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-body-md font-medium text-on-surface group-hover:text-primary transition-colors truncate">
                          {app.name}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-success/10 rounded-xs">
                          <div className="w-2 h-2 rounded-full bg-success"></div>
                          <span className="text-label-sm text-success font-mono">Active</span>
                        </div>
                      </div>

                      {/* Endpoints Count */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                          <Activity className="w-3 h-3" />
                          <span className="font-mono">{app.endpointsCount}</span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                          <Calendar className="w-3 h-3" />
                          <span className="font-mono">{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={(e) => openEditModal(e, app)}
                          className="p-2 hover:bg-surface-container-highest rounded-sm transition-colors"
                          title="Edit agent"
                        >
                          <Edit2 className="w-4 h-4 text-on-surface-variant hover:text-on-surface transition-colors" />
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
