import { useState, useEffect } from 'react';
import { Shield, Plus, Folder, Calendar, Activity, ExternalLink, Edit2 } from 'lucide-react';
import Card from '../components/Card';
import CreateApplicationModal from '../components/CreateApplicationModal';
import EditProjectModal from '../components/EditProjectModal';
import Sidebar from '../components/Sidebar';
import apiClient from '../api/client';

const ApplicationsPage = ({ onSelectApplication, onNavigate, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAgents();
      if (response.success) {
        // Backend already sends endpoints array and spec, just add endpointsCount
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
        // Auto-sync mode: Create agent with schema source URL and sync interval
        const agentResponse = await apiClient.createAgent(
          appData.name,
          null, // targetBaseUrl is optional
          null, // openApiSpec
          appData.schemaSourceUrl,
          appData.schemaSyncInterval
        );

        if (!agentResponse.success) {
          throw new Error(agentResponse.error || 'Failed to create agent');
        }
      } else {
        // Upload mode: Create agent and upload schema
        const agentResponse = await apiClient.createAgent(
          appData.name,
          null // targetBaseUrl is optional for validation-only mode
        );

        if (!agentResponse.success) {
          throw new Error(agentResponse.error || 'Failed to create agent');
        }

        const agent = agentResponse.data;

        // Upload the OpenAPI schema
        if (appData.spec) {
          await apiClient.uploadSchema(agent.id, appData.spec, appData.version);
        }
      }

      // Reload agents
      await loadAgents();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw to show error in modal
    }
  };

  const handleEditAgent = async (agentId, updateData, schemaFile, schemaMode) => {
    try {
      setError(null);

      // Step 1: Update agent details (name, targetBaseUrl, auto-sync settings)
      if (Object.keys(updateData).length > 0) {
        const updateResponse = await apiClient.updateAgent(agentId, updateData);
        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to update agent');
        }
      }

      // Step 2: Upload new schema if in upload mode and file provided
      if (schemaMode === 'upload' && schemaFile) {
        await apiClient.uploadSchema(agentId, schemaFile, schemaFile.info?.version || '1.0.0');
      }

      // Step 3: Reload agents
      await loadAgents();
      setIsEditModalOpen(false);
      setSelectedAgent(null);
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw to show error in modal
    }
  };

  const openEditModal = (e, agent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans flex">
      {/* Sidebar */}
      <Sidebar activeView="applications" onNavigate={onNavigate} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 ml-64 p-6">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Agents</h1>
        <p className="text-slate-600">
          Manage your AI agents and monitor their security status
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-slate-600">Loading agents...</div>
        </div>
      ) : applications.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mb-6">
            <Folder className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No agents yet</h2>
          <p className="text-slate-600 mb-8 text-center max-w-md">
            Get started by creating your first agent and uploading your API specification
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Your First Agent
          </button>
        </div>
      ) : (
        <>
          {/* Create New Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Agent
            </button>
          </div>

          {/* Agents Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card
                key={app.id}
                className="p-6 hover:border-slate-800 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group"
                onClick={() => {
                  console.log('Card clicked!', app);
                  onSelectApplication(app);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                    <Shield className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => openEditModal(e, app)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit agent"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-slate-900 transition-colors" />
                    </button>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-2 group-hover:text-slate-900 transition-colors">
                  {app.name}
                </h3>

                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {app.description || 'No description provided'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Activity className="w-3 h-3" />
                    <span className="font-mono">{app.endpointsCount} endpoints</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span className="font-mono">Created {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-600">Active</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Agent Modal */}
      {isModalOpen && (
        <CreateApplicationModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateApp}
        />
      )}

      {/* Edit Agent Modal */}
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
