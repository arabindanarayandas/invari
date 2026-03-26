import { useState, useEffect } from 'react';
import { useNavigate as useNavigateHook, useSearchParams } from 'react-router-dom';
import { Shield, Plus, Folder, Calendar, Activity, ExternalLink, Edit2 } from 'lucide-react';
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-on-surface-variant">Loading agents...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-surface-container-low border border-outline-variant rounded-md flex items-center justify-center mb-6">
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
            <div className="mb-6 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                New Agent
              </Button>
            </div>

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
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-surface-container-low border border-outline-variant rounded-sm flex items-center justify-center group-hover:bg-primary transition-colors">
                      <Shield className="w-6 h-6 text-on-surface group-hover:text-white transition-colors" />
                    </div>
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

                  <div className="pt-4 border-t border-outline-variant">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success"></div>
                      <span className="text-label-sm text-on-surface-variant">Active</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
