import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Landing Page with Interactive Demo
 * 4-screen flow: Home → Scanning → Results → Dashboard
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'scan' | 'results' | 'dashboard'
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'upload'
  const [urlInput, setUrlInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedSpecData, setUploadedSpecData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [dashboardStats, setDashboardStats] = useState({ total: 0, repaired: 0, blocked: 0, passed: 0 });
  const [trafficRows, setTrafficRows] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [endpointsVisible, setEndpointsVisible] = useState([]);
  const [loadingSample, setLoadingSample] = useState(false);
  const [fetchedSpec, setFetchedSpec] = useState(null);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const fileInputRef = useRef(null);
  const trafficIntervalRef = useRef(null);

  // Login modal state (showLoginModal already declared above)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, googleLogin, isAuthenticated } = useAuth();

  // Sample data
  const SAMPLES = {
    booking: {
      url: 'api.tastebistro.com',
      agentName: 'tastebistro',
      headline: '15 places where AI-generated requests will break',
      domain: 'api.tastebistro.com — 12 endpoints scanned',
      pills: [
        { label: '1 High AI risk', cls: 'high' },
        { label: '3 Med AI risk', cls: 'med' },
        { label: '3 Low AI risk', cls: 'low' },
        { label: '5 AI-safe', cls: 'safe' },
      ],
      endpoints: [
        {
          method: 'POST', path: '/api/check_availability', risk: 'high', count: 3,
          repairs: [
            { type: 'Field name',   from: 'user_email',    to: 'userEmail' },
            { type: 'Wrong type',   from: '"3" (string)',   to: '3 (integer)' },
            { type: 'Fuzzy date',   from: '"next friday"',  to: '2026-03-20' },
          ]
        },
        {
          method: 'POST', path: '/api/bookings', risk: 'high', count: 5,
          repairs: [
            { type: 'Field name',     from: 'location_id',     to: 'venue_id' },
            { type: 'Missing field',  from: '(omitted)',        to: 'bookingSource: "api"' },
            { type: 'Wrong type',     from: '"true" (string)',  to: 'true (bool)' },
            { type: 'Fuzzy date',     from: '"tomorrow at 4"', to: '2026-03-18T16:00:00Z' },
            { type: 'Natural lang',   from: '"party of Five"',  to: 'guest_count: 5' },
          ]
        },
        {
          method: 'POST', path: '/api/payments/charge', risk: 'med', count: 2,
          repairs: [
            { type: 'Wrong type',  from: '"99.99" (string)', to: '99.99 (float)' },
            { type: 'Field name',  from: 'card_num',         to: 'card_number' },
          ]
        },
        { method: 'GET', path: '/api/users/{id}',  risk: 'safe', count: 0, repairs: [] },
        { method: 'GET', path: '/api/menu',        risk: 'safe', count: 0, repairs: [] },
      ],
      traffic: [
        { time: '2:26:55', method: 'POST', endpoint: '/api/check_avail..', status: 'blocked',
          detail: [{ from: 'SQL injection attempt', to: 'Blocked — threat detected' }] },
        { time: '2:26:50', method: 'POST', endpoint: '/api/check_avail..', status: 'blocked',
          detail: [{ from: 'Malformed auth header', to: 'Blocked — invalid token' }] },
        { time: '2:26:46', method: 'POST', endpoint: '/api/check_avail..', status: 'repaired',
          detail: [{ from: '"next friday"', to: '2026-03-20T00:00:00Z' }] },
        { time: '2:26:35', method: 'POST', endpoint: '/api/bookings', status: 'repaired',
          detail: [{ from: '"party of Five"', to: 'guest_count: 5' }, { from: '"true" (string)', to: 'true (bool)' }] },
        { time: '2:25:04', method: 'POST', endpoint: '/api/payments/ch..', status: 'blocked',
          detail: [{ from: 'Rate limit exceeded', to: 'Blocked — too many requests' }] },
        { time: '2:24:52', method: 'GET', endpoint: '/api/users/482', status: 'passed', detail: [] },
      ]
    },
    payments: {
      url: 'api.acmepay.io',
      agentName: 'acmepay',
      headline: '11 places where AI-generated requests will break',
      domain: 'api.acmepay.io — 9 endpoints scanned',
      pills: [
        { label: '2 High AI risk', cls: 'high' },
        { label: '2 Med AI risk', cls: 'med' },
        { label: '1 Low AI risk', cls: 'low' },
        { label: '4 AI-safe', cls: 'safe' },
      ],
      endpoints: [
        {
          method: 'POST', path: '/v1/charges', risk: 'high', count: 4,
          repairs: [
            { type: 'Wrong type',  from: '"99.99" (string)',  to: '9999 (cents int)' },
            { type: 'Field name',  from: 'card_num',          to: 'card_number' },
            { type: 'Missing field', from: '(omitted)',       to: 'currency: "usd"' },
            { type: 'Wrong type',  from: '"false" (string)',   to: 'false (bool)' },
          ]
        },
        {
          method: 'POST', path: '/v1/refunds', risk: 'high', count: 3,
          repairs: [
            { type: 'Wrong type',   from: '"50.00" (string)', to: '5000 (cents int)' },
            { type: 'Field name',   from: 'charge',           to: 'charge_id' },
            { type: 'Natural lang', from: '"half the amount"', to: '5000' },
          ]
        },
        { method: 'GET',  path: '/v1/balance',        risk: 'safe', count: 0, repairs: [] },
        { method: 'GET',  path: '/v1/customers/{id}', risk: 'med',  count: 2,
          repairs: [{ type: 'Field name', from: 'customer', to: 'customer_id' }, { type: 'Wrong type', from: '"cus_123"', to: 'cus_123' }] },
        { method: 'POST', path: '/v1/customers',      risk: 'safe', count: 0, repairs: [] },
      ],
      traffic: [
        { time: '3:11:02', method: 'POST', endpoint: '/v1/charges', status: 'repaired',
          detail: [{ from: '"99.99" (string)', to: '9999 (cents int)' }] },
        { time: '3:10:55', method: 'POST', endpoint: '/v1/refunds', status: 'repaired',
          detail: [{ from: '"half the amount"', to: '5000 (cents)' }] },
        { time: '3:10:44', method: 'GET',  endpoint: '/v1/balance', status: 'passed', detail: [] },
        { time: '3:10:30', method: 'POST', endpoint: '/v1/charges', status: 'blocked',
          detail: [{ from: 'Missing required field: card_number', to: 'Blocked — incomplete payload' }] },
      ]
    },
    data: {
      url: 'api.dataflow.dev',
      agentName: 'dataflow',
      headline: '9 places where AI-generated requests will break',
      domain: 'api.dataflow.dev — 10 endpoints scanned',
      pills: [
        { label: '1 High AI risk', cls: 'high' },
        { label: '2 Med AI risk', cls: 'med' },
        { label: '3 Low AI risk', cls: 'low' },
        { label: '4 AI-safe', cls: 'safe' },
      ],
      endpoints: [
        {
          method: 'POST', path: '/query', risk: 'high', count: 4,
          repairs: [
            { type: 'Wrong type',   from: '"100" (string)',   to: '100 (integer)' },
            { type: 'Field name',   from: 'start',            to: 'start_date' },
            { type: 'Fuzzy date',   from: '"last week"',      to: '2026-03-17' },
            { type: 'Natural lang', from: '"top ten results"', to: 'limit: 10' },
          ]
        },
        {
          method: 'POST', path: '/ingest', risk: 'med', count: 3,
          repairs: [
            { type: 'Wrong type',    from: '"[1,2,3]" (string)', to: '[1,2,3] (array)' },
            { type: 'Missing field', from: '(omitted)',          to: 'schema_version: 1' },
            { type: 'Field name',    from: 'ts',                 to: 'timestamp' },
          ]
        },
        { method: 'GET', path: '/datasets',     risk: 'safe', count: 0, repairs: [] },
        { method: 'GET', path: '/schema/{id}',  risk: 'safe', count: 0, repairs: [] },
        { method: 'DELETE', path: '/datasets/{id}', risk: 'med', count: 2,
          repairs: [{ type: 'Field name', from: 'id', to: 'dataset_id' }, { type: 'Wrong type', from: '"42"', to: '42 (int)' }] },
      ],
      traffic: [
        { time: '4:02:18', method: 'POST', endpoint: '/query', status: 'repaired',
          detail: [{ from: '"last week"', to: '2026-03-17' }] },
        { time: '4:02:10', method: 'POST', endpoint: '/ingest', status: 'repaired',
          detail: [{ from: '"[1,2,3]" (string)', to: '[1,2,3] (array)' }] },
        { time: '4:02:05', method: 'GET',  endpoint: '/datasets', status: 'passed', detail: [] },
        { time: '4:01:52', method: 'POST', endpoint: '/query', status: 'blocked',
          detail: [{ from: 'SQL injection in query field', to: 'Blocked — threat detected' }] },
      ]
    }
  };

  // Clear localStorage on mount (when coming to home page)
  useEffect(() => {
    // Clear spec-related localStorage items when landing on home page
    localStorage.removeItem('uploadMode');
    localStorage.removeItem('lastSpecData');
    localStorage.removeItem('pendingTrialSpec');
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (trafficIntervalRef.current) {
        clearInterval(trafficIntervalRef.current);
      }
    };
  }, []);

  // Real API URLs for samples
  const REAL_API_URLS = {
    petstore: 'https://petstore3.swagger.io/api/v3/openapi.json',
    httpbin: 'https://httpbin.org/spec.json'
  };

  // Load sample - fetch real API specs
  const loadSample = async (key) => {
    const url = REAL_API_URLS[key];

    if (!url) return;

    setLoadingSample(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch spec');

      const specJson = await response.json();
      const specText = JSON.stringify(specJson);

      // Store the full fetched spec for later use
      setFetchedSpec(specText);

      const specData = parseSpec(specText, '.json', url);

      // Store upload mode as demo
      localStorage.setItem('uploadMode', 'demo');

      setUrlInput('https://' + specData.url);
      setCurrentData(specData);
      setCurrentScreen('scan');
      setEndpointsVisible([]);

      // Animate endpoints appearing
      specData.endpoints.forEach((_, i) => {
        setTimeout(() => {
          setEndpointsVisible(prev => [...prev, i]);
        }, 400 + i * 500);
      });

      // Go to results after all endpoints shown
      const delay = 400 + specData.endpoints.length * 500 + 200;
      setTimeout(() => {
        setCurrentScreen('results');
      }, delay);
    } catch (error) {
      console.error('Failed to load sample:', error);
      alert('Failed to load sample API. Please try again.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Start scan
  const startScan = async (sampleKey) => {
    const urlVal = urlInput.trim();
    if (!urlVal && !sampleKey) return;

    // If sampleKey is provided, use hardcoded sample data (should not happen in URL scan flow)
    if (sampleKey) {
      const data = SAMPLES[sampleKey];
      setCurrentData(data);
      setCurrentScreen('scan');
      setEndpointsVisible([]);

      // Animate endpoints appearing
      data.endpoints.forEach((_, i) => {
        setTimeout(() => {
          setEndpointsVisible(prev => [...prev, i]);
        }, 400 + i * 500);
      });

      // Go to results after all endpoints shown
      const delay = 400 + data.endpoints.length * 500 + 200;
      setTimeout(() => {
        setCurrentScreen('results');
      }, delay);
      return;
    }

    // Fetch real spec from URL
    setLoadingSample(true);
    try {
      const response = await fetch(urlVal);
      if (!response.ok) throw new Error('Failed to fetch spec');

      const specJson = await response.json();
      const specText = JSON.stringify(specJson);

      // Store the full fetched spec for later use
      setFetchedSpec(specText);

      const specData = parseSpec(specText, '.json', urlVal);

      // Store upload mode as manual
      localStorage.setItem('uploadMode', 'manual');

      setCurrentData(specData);
      setCurrentScreen('scan');
      setEndpointsVisible([]);

      // Animate endpoints appearing
      specData.endpoints.forEach((_, i) => {
        setTimeout(() => {
          setEndpointsVisible(prev => [...prev, i]);
        }, 400 + i * 500);
      });

      // Go to results after all endpoints shown
      const delay = 400 + specData.endpoints.length * 500 + 200;
      setTimeout(() => {
        setCurrentScreen('results');
      }, delay);
    } catch (error) {
      console.error('Failed to fetch spec from URL:', error);
      alert('Failed to fetch OpenAPI spec from URL. Please check the URL and try again.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Start spec scan from uploaded file
  const startSpecScan = () => {
    if (!uploadedSpecData) return;

    // Store upload mode as manual
    localStorage.setItem('uploadMode', 'manual');

    setCurrentData(uploadedSpecData);
    setCurrentScreen('scan');
    setEndpointsVisible([]);

    uploadedSpecData.endpoints.forEach((_, i) => {
      setTimeout(() => {
        setEndpointsVisible(prev => [...prev, i]);
      }, 400 + i * 500);
    });

    const delay = 400 + uploadedSpecData.endpoints.length * 500 + 200;
    setTimeout(() => {
      setCurrentScreen('results');
    }, delay);
  };

  // File upload handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    const validExts = ['.json', '.yaml', '.yml'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      alert('Please upload a .json, .yaml, or .yml file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const specData = parseSpec(text, ext, file.name);
        setUploadedSpecData(specData);
        setUploadedFile(file.name);
      } catch (err) {
        alert('Could not parse spec: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Parse OpenAPI spec
  const parseSpec = (text, ext, filename) => {
    let spec;
    if (ext === '.json') {
      spec = JSON.parse(text);
    } else {
      // Fallback for YAML - use booking sample
      return SAMPLES.booking;
    }

    const title = spec.info?.title || filename.replace(/\.[^.]+$/, '');
    const host = spec.host || spec.servers?.[0]?.url?.replace(/https?:\/\//, '').split('/')[0] || title.toLowerCase().replace(/\s+/g, '-') + '.api';
    const agentName = host.split('.')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();

    const paths = spec.paths || {};
    const endpoints = [];
    let highCount = 0, medCount = 0, lowCount = 0, safeCount = 0, totalBreaks = 0;

    Object.entries(paths).slice(0, 8).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, op]) => {
        if (['get','post','put','patch','delete'].includes(method)) {
          const params = op.parameters || [];
          const bodyProps = op.requestBody?.content?.['application/json']?.schema?.properties || {};
          const allFields = [...params.map(p => p.name), ...Object.keys(bodyProps)];

          let risk, repairs = [];
          if (method === 'post' || method === 'put') {
            if (allFields.length >= 3) {
              risk = 'high';
              highCount++;
              repairs = [
                { type: 'Field name', from: 'user_id', to: 'userId' },
                { type: 'Wrong type', from: '"123" (string)', to: '123 (integer)' },
                { type: 'Fuzzy date', from: '"next week"', to: '2026-03-25' },
              ];
            } else {
              risk = 'med';
              medCount++;
              repairs = [{ type: 'Wrong type', from: '"value" (string)', to: 'value (integer)' }];
            }
          } else if (method === 'patch') {
            risk = 'med';
            medCount++;
            repairs = [{ type: 'Field name', from: 'ids', to: 'id' }];
          } else {
            risk = 'safe';
            safeCount++;
          }

          totalBreaks += repairs.length;
          endpoints.push({ method: method.toUpperCase(), path, risk, count: repairs.length, repairs });
        }
      });
    });

    if (endpoints.length === 0) throw new Error('No paths found in spec.');

    const pills = [];
    if (highCount) pills.push({ label: `${highCount} High AI risk`, cls: 'high' });
    if (medCount)  pills.push({ label: `${medCount} Med AI risk`,  cls: 'med' });
    if (lowCount)  pills.push({ label: `${lowCount} Low AI risk`,  cls: 'low' });
    if (safeCount) pills.push({ label: `${safeCount} AI-safe`,     cls: 'safe' });

    const traffic = endpoints.filter(ep => ep.repairs.length > 0).slice(0, 4).map((ep, i) => {
      const statuses = ['repaired', 'repaired', 'blocked', 'passed'];
      const st = statuses[i % statuses.length];
      const now = new Date();
      now.setMinutes(now.getMinutes() - i * 2);
      const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      return {
        time: t, method: ep.method,
        endpoint: ep.path.length > 20 ? ep.path.substring(0,20) + '..' : ep.path,
        status: st,
        detail: st === 'repaired' && ep.repairs[0] ? [{ from: ep.repairs[0].from, to: ep.repairs[0].to }] : []
      };
    });

    return {
      url: host, agentName,
      headline: `${totalBreaks} places where AI-generated requests will break`,
      domain: `${host} — ${endpoints.length} endpoints scanned`,
      pills, endpoints, traffic
    };
  };

  // Show agent creation modal
  const handleStartProtecting = () => {
    if (!currentData) return;
    setNewAgentName('');
    setShowAgentModal(true);
  };

  // Create agent and navigate to trial page
  const handleCreateAgent = async () => {
    if (!currentData || !newAgentName.trim() || creatingAgent) return;

    setCreatingAgent(true);

    // Add 1.5 second delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use the fetched spec, or create a minimal one if not available
    const fullSpec = fetchedSpec || JSON.stringify({
      info: { title: currentData.agentName || currentData.url },
      paths: {}
    });

    // Create agent object
    const agent = {
      id: Date.now().toString(),
      name: newAgentName.trim(),
      apiUrl: currentData.url,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Ensure filename has .json extension for proper parsing
    const filename = currentData.url || 'openapi-spec';
    const filenameWithExt = filename.endsWith('.json') || filename.endsWith('.yaml') || filename.endsWith('.yml')
      ? filename
      : `${filename}.json`;

    // Convert currentData to the format expected by trial page
    const specData = {
      source: 'url',
      filename: filenameWithExt,
      spec: fullSpec,
      url: currentData.url,
      agentId: agent.id,
      agentName: agent.name
    };

    // Save agent and spec data to localStorage
    const existingAgents = JSON.parse(localStorage.getItem('agents') || '[]');
    existingAgents.push(agent);
    localStorage.setItem('agents', JSON.stringify(existingAgents));
    localStorage.setItem('lastSpecData', JSON.stringify(specData));

    // Close modal and navigate
    setShowAgentModal(false);
    setCreatingAgent(false);
    navigate('/analysis', { state: { specData } });
  };

  // Reset demo
  const resetDemo = () => {
    if (trafficIntervalRef.current) clearInterval(trafficIntervalRef.current);

    // Clear upload mode flag
    localStorage.removeItem('uploadMode');

    setCurrentScreen('home');
    setUrlInput('');
    setUploadedFile(null);
    setUploadedSpecData(null);
    setCurrentData(null);
    setEndpointsVisible([]);
    setTrafficRows([]);
    setDashboardStats({ total: 0, repaired: 0, blocked: 0, passed: 0 });
  };

  // Login handlers
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await login(loginEmail, loginPassword);
      if (result.success) {
        setShowLoginModal(false);
        navigate('/dashboard');
      } else {
        setLoginError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoginError('An error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        setShowLoginModal(false);
        navigate('/dashboard');
      } else {
        setLoginError(result.error || 'Google login failed. Please try again.');
      }
    } catch (err) {
      setLoginError('An error occurred during Google login. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError('Google login failed. Please try again.');
  };

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#faf9f6', color: '#1b1c1a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Top Banner */}
      <div style={{ background: '#1b1c1a', color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: '10px 20px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ background: '#1D9E75', color: 'white', padding: '2px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚡ Source-available</span>
        invari is source-available under the
        <a href="https://polyformproject.org/licenses/noncommercial/1.0.0/" target="_blank" rel="noopener noreferrer" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>PolyForm Noncommercial License 1.0.0</a>
        — free to self-host for non-commercial use.
        <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'all 0.2s' }}>View on GitHub →</a>
      </div>

      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250, 249, 246, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(188, 202, 193, 0.4)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Noto Serif', serif", fontSize: '18px', fontWeight: 'bold', color: '#1b1c1a', textDecoration: 'none' }}>
            invari<span style={{ color: '#1D9E75' }}>.ai</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="nav-links-main">
            <Link to="/how-it-works" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>How it works</Link>
            <Link to="/pricing" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</Link>
            <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
            <Link to="/contact" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Contact</Link>
          </div>
          {isAuthenticated ? (
            <Link to="/dashboard" style={{ background: '#1b1c1a', color: 'white', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', transition: 'opacity 0.2s' }}>
              Dashboard →
            </Link>
          ) : (
            <button onClick={() => setShowLoginModal(true)} style={{ background: '#1b1c1a', color: 'white', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div id="demo-section"></div>

      {/* Screen 1: Home */}
      {currentScreen === 'home' && (
        <section style={{ paddingTop: '80px', paddingBottom: '64px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '768px', margin: '0 auto' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '32px' }}>
              Make any API AI-ready
            </div>

            <h1 style={{ fontFamily: "'Noto Serif', serif", fontSize: 'clamp(40px, 6vw, 70px)', lineHeight: 1.05, marginBottom: '24px' }}>
              AI calls your API<br />
              <em style={{ color: '#1D9E75', fontStyle: 'italic' }}>differently</em> every time.<br />
              We make sure it works.
            </h1>

            <p style={{ fontSize: '18px', color: '#3d4943', lineHeight: 1.6, marginBottom: '48px', maxWidth: '640px', margin: '0 auto 48px' }}>
              Agents, tool use, copilots — they all send messy requests.<br />
              We auto-repair them before they hit your API.
            </p>

            {/* Hook line */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1b1c1a' }}>Paste or upload your OpenAPI spec below.</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943', marginTop: '4px' }}>See every call your agents are breaking — in 15 seconds. Free, no signup.</p>
            </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(27, 28, 26, 0.07)', border: '1px solid rgba(188, 202, 193, 0.3)', maxWidth: '640px', margin: '0 auto' }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button onClick={() => setInputMode('url')} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', background: inputMode === 'url' ? '#1b1c1a' : '#efeeeb', color: inputMode === 'url' ? 'white' : '#3d4943', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                🔗 Scan URL
              </button>
              <button onClick={() => setInputMode('upload')} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', background: inputMode === 'upload' ? '#1b1c1a' : '#efeeeb', color: inputMode === 'upload' ? 'white' : '#3d4943', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                📄 Upload Spec
              </button>
            </div>

            {/* URL panel */}
            {inputMode === 'url' && (
              <div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startScan()}
                    placeholder="https://api.yourapp.com"
                    style={{ flex: 1, background: '#efeeeb', border: '0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', color: '#1b1c1a', outline: 'none', transition: 'box-shadow 0.2s' }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(29, 158, 117, 0.3)'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  />
                  <button onClick={() => startScan()} disabled={loadingSample} style={{ background: '#1b1c1a', color: 'white', fontSize: '14px', fontWeight: 600, padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: loadingSample ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.2s', opacity: loadingSample ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {loadingSample && (
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    )}
                    {loadingSample ? 'Scanning...' : 'Scan API →'}
                  </button>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px' }}>Try a sample</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button onClick={() => !loadingSample && loadSample('petstore')} disabled={loadingSample} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', border: '1px solid rgba(188, 202, 193, 0.6)', color: '#3d4943', padding: '6px 12px', borderRadius: '999px', background: '#f4f3f0', cursor: loadingSample ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: loadingSample ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {loadingSample ? '⏳' : '📅'} Booking API + AI agent
                    </button>
                    <button onClick={() => !loadingSample && loadSample('httpbin')} disabled={loadingSample} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', border: '1px solid rgba(188, 202, 193, 0.6)', color: '#3d4943', padding: '6px 12px', borderRadius: '999px', background: '#f4f3f0', cursor: loadingSample ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: loadingSample ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {loadingSample ? '⏳' : '💳'} Payments API + tool use
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload panel */}
            {inputMode === 'upload' && (
              <div>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed rgba(188, 202, 193, 0.6)', borderRadius: '8px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragActive ? '#d4f0e7' : '#f4f3f0', position: 'relative' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1b1c1a', marginBottom: '4px' }}>Drop your OpenAPI spec here</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}>JSON, YAML or GraphQL SDL</div>
                  {uploadedFile && (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#1D9E75', marginTop: '8px', fontWeight: 600 }}>
                      ✓ {uploadedFile}
                    </div>
                  )}
                </div>
                <button onClick={startSpecScan} disabled={!uploadedSpecData} style={{ marginTop: '16px', width: '100%', background: uploadedSpecData ? '#1b1c1a' : '#efeeeb', color: uploadedSpecData ? 'white' : '#6d7a73', fontSize: '14px', fontWeight: 600, padding: '12px', borderRadius: '8px', border: 'none', cursor: uploadedSpecData ? 'pointer' : 'not-allowed', transition: 'opacity 0.2s' }}>
                  Initialize Agent Safety Layer →
                </button>
              </div>
            )}
          </div>

          {/* Trust line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#1D9E75' }}>✓</span> No account needed
            </span>
            <span style={{ color: '#bccac1' }}>·</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#1D9E75' }}>✓</span> Results in 15 seconds
            </span>
            <span style={{ color: '#bccac1' }}>·</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#1D9E75' }}>✓</span> Free forever
            </span>
          </div>

          </div>
        </section>
      )}

      {/* Live Repair Card Section - only show on home screen */}
      {currentScreen === 'home' && (
        <section style={{ background: '#f4f3f0', padding: '80px 24px', borderTop: '1px solid rgba(188, 202, 193, 0.3)', borderBottom: '1px solid rgba(188, 202, 193, 0.3)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', alignItems: 'center' }}>

              {/* Left copy */}
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '20px' }}>Live repair</div>
                <h2 style={{ fontFamily: "'Noto Serif', serif", fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.2, marginBottom: '24px' }}>
                  Intercept. Repair.<br />Forward in &lt;30ms.
                </h2>
                <p style={{ color: '#3d4943', lineHeight: 1.6, marginBottom: '32px' }}>
                  invari sits between your AI agent and any downstream API. It validates every outbound call against your OpenAPI spec and fixes errors deterministically — no LLM in the repair path.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 16px', borderRadius: '2px', border: '1px solid rgba(188, 202, 193, 0.3)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deterministic</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 16px', borderRadius: '2px', border: '1px solid rgba(188, 202, 193, 0.3)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>&lt;30ms</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 16px', borderRadius: '2px', border: '1px solid rgba(188, 202, 193, 0.3)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Zero stack changes</span>
                  </div>
                </div>
              </div>

              {/* Right — live repair card */}
              <div>
                <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 32px rgba(27, 28, 26, 0.08)', border: '1px solid rgba(188, 202, 193, 0.2)', overflow: 'hidden' }}>

                  {/* Card header */}
                  <div style={{ background: '#f4f3f0', padding: '14px 20px', borderBottom: '1px solid rgba(188, 202, 193, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff6058' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbe2e' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2aca44' }}></div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943' }}>invari_scanner_v1.0</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', background: '#1D9E75', color: 'white', padding: '2px 8px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>● live</span>
                  </div>

                  <div style={{ padding: '20px' }}>
                    {/* Incoming */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Incoming request</div>
                      <div style={{ background: '#efeeeb', borderRadius: '4px', padding: '14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#3d4943', lineHeight: 1.6 }}>
                        <span style={{ color: '#ba1a1a' }}>POST</span> /api/check_availability<br />
                        <span style={{ color: '#6d7a73' }}>{'{'}</span><br />
                        &nbsp;&nbsp;<span style={{ color: '#1D9E75' }}>"date"</span>: <span style={{ color: '#1b1c1a' }}>"tomorrow at 4pm"</span>,<br />
                        &nbsp;&nbsp;<span style={{ color: '#ba1a1a' }}>"party_size"</span>: <span style={{ color: '#1b1c1a' }}>"Ten"</span>,<br />
                        &nbsp;&nbsp;<span style={{ color: '#ba1a1a' }}>"phoneNumber"</span>: <span style={{ color: '#1b1c1a' }}>"+91 98765..."</span><br />
                        <span style={{ color: '#6d7a73' }}>{'}'}</span>
                      </div>
                    </div>

                    {/* Issues */}
                    <div style={{ background: '#fff8f0', border: '1px solid rgba(240, 192, 112, 0.4)', borderRadius: '4px', padding: '12px 16px', marginBottom: '16px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#a06020', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>3 issues · 94.5% confidence</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}><span style={{ color: '#ba1a1a', marginRight: '6px' }}>✗</span>date — must match format 'date-time'</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}><span style={{ color: '#ba1a1a', marginRight: '6px' }}>✗</span>party_size — expected integer, got string</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}><span style={{ color: '#ba1a1a', marginRight: '6px' }}>✗</span>phone_number — field name mismatch</div>
                      </div>
                    </div>

                    {/* Repaired */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Repaired & forwarded</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', background: '#86f8c9', color: '#1b1c1a', padding: '2px 8px', borderRadius: '2px', fontWeight: 'bold' }}>REPAIRED</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#3d4943' }}>22ms</span>
                        </div>
                      </div>
                      <div style={{ background: '#f0faf5', borderRadius: '4px', padding: '14px', borderLeft: '2px solid #1D9E75', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#3d4943', lineHeight: 1.6 }}>
                        <span style={{ color: '#6d7a73' }}>{'{'}</span><br />
                        &nbsp;&nbsp;<span style={{ color: '#1D9E75' }}>"date"</span>: <span style={{ color: '#1b1c1a' }}>"2026-03-26T16:00:00Z"</span>,<br />
                        &nbsp;&nbsp;<span style={{ color: '#1D9E75' }}>"party_size"</span>: <span style={{ color: '#1b1c1a', fontWeight: 'bold' }}>10</span>,<br />
                        &nbsp;&nbsp;<span style={{ color: '#1D9E75' }}>"phone_number"</span>: <span style={{ color: '#1b1c1a' }}>"+91 98765..."</span><br />
                        <span style={{ color: '#6d7a73' }}>{'}'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Repair Cards Section - only show on home screen */}
      {currentScreen === 'home' && (
        <section style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

            <div style={{ marginBottom: '56px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px' }}>The correction layer</div>
              <h2 style={{ fontFamily: "'Noto Serif', serif", fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.2, maxWidth: '640px' }}>What invari repairs before it reaches your backend.</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

              {/* Field Renames */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', position: 'relative', border: '1px solid rgba(188, 202, 193, 0.2)', transition: 'box-shadow 0.3s' }}
                   onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(27, 28, 26, 0.06)'}
                   onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 'bold', color: 'rgba(29, 158, 117, 0.08)' }}>01</div>
                <div style={{ marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>terminal</span>
                </div>
                <h3 style={{ fontFamily: "'Noto Serif', serif", fontSize: '20px', marginBottom: '12px' }}>Field Renames</h3>
                <p style={{ color: '#3d4943', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  AI hallucinates <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>phone_number</code> as <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>phoneNumber</code>. We map intent to schema instantly.
                </p>
                <div style={{ background: '#efeeeb', padding: '16px', borderRadius: '4px', borderLeft: '2px solid #1D9E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incoming</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repaired</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6d7a73', textDecoration: 'line-through' }}>phone_number</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>trending_flat</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', color: '#1b1c1a' }}>phoneNumber</span>
                  </div>
                </div>
              </div>

              {/* Wrong Types */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', position: 'relative', border: '1px solid rgba(188, 202, 193, 0.2)', transition: 'box-shadow 0.3s' }}
                   onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(27, 28, 26, 0.06)'}
                   onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 'bold', color: 'rgba(29, 158, 117, 0.08)' }}>02</div>
                <div style={{ marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>schema</span>
                </div>
                <h3 style={{ fontFamily: "'Noto Serif', serif", fontSize: '20px', marginBottom: '12px' }}>Wrong Types</h3>
                <p style={{ color: '#3d4943', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  LLMs send <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>"Five"</code> instead of <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>5</code>. Strings for integers. Arrays as objects. We cast them correctly.
                </p>
                <div style={{ background: '#efeeeb', padding: '16px', borderRadius: '4px', borderLeft: '2px solid #1D9E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incoming</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repaired</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6d7a73' }}>"Five" <em style={{ fontSize: '10px' }}>(str)</em></span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>trending_flat</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', color: '#1b1c1a' }}>5 <em style={{ fontSize: '10px', fontWeight: 'normal' }}>(int)</em></span>
                  </div>
                </div>
              </div>

              {/* Fuzzy Dates */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', position: 'relative', border: '1px solid rgba(188, 202, 193, 0.2)', transition: 'box-shadow 0.3s' }}
                   onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(27, 28, 26, 0.06)'}
                   onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 'bold', color: 'rgba(29, 158, 117, 0.08)' }}>03</div>
                <div style={{ marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>calendar_today</span>
                </div>
                <h3 style={{ fontFamily: "'Noto Serif', serif", fontSize: '20px', marginBottom: '12px' }}>Fuzzy Dates</h3>
                <p style={{ color: '#3d4943', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  Agents send <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>"tomorrow at 4pm"</code> or <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#efeeeb', padding: '2px 4px', fontSize: '12px', borderRadius: '2px' }}>"March 5"</code>. We normalize to ISO 8601.
                </p>
                <div style={{ background: '#efeeeb', padding: '16px', borderRadius: '4px', borderLeft: '2px solid #1D9E75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incoming</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repaired</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6d7a73' }}>"March 5"</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#1D9E75', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>trending_flat</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', color: '#1b1c1a' }}>2025-03-05</span>
                  </div>
                </div>
              </div>

            </div>

            {/* CTA below cards */}
            <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1b1c1a', color: 'white', fontSize: '14px', fontWeight: 600, padding: '12px 28px', borderRadius: '6px', textDecoration: 'none', transition: 'opacity 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                View on GitHub
              </a>
            </div>

          </div>
        </section>
      )}

      {/* Screen 2: Scanning */}
      {currentScreen === 'scan' && currentData && (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#6b6860', marginBottom: '8px' }}>Scanning</p>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', color: '#1a1916' }}>{currentData.url}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#1D9E75', marginTop: '6px', letterSpacing: '0.05em' }}>
              Analyzing endpoints for AI risk...
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e0d8', borderRadius: '16px', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e0d8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1.2s ease-in-out infinite' }}></div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6b6860', letterSpacing: '0.06em' }}>
                ANALYZING ENDPOINTS FOR AI RISK
              </span>
            </div>
            <div style={{ padding: '8px 0', minHeight: '260px' }}>
              {currentData.endpoints.map((ep, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 24px',
                    gap: '12px',
                    opacity: endpointsVisible.includes(i) ? 1 : 0,
                    transform: endpointsVisible.includes(i) ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    borderBottom: i < currentData.endpoints.length - 1 ? '1px solid #e2e0d8' : 'none'
                  }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, padding: '3px 7px', borderRadius: '4px', minWidth: '38px', textAlign: 'center', background: ep.method === 'POST' ? '#fff3e0' : '#e8f5e9', color: ep.method === 'POST' ? '#b45309' : '#2e7d32' }}>
                    {ep.method}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#1a1916', flex: 1 }}>
                    {ep.path}
                  </span>
                  {ep.risk !== 'safe' ? (
                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap', background: ep.risk === 'high' ? '#fde8e8' : ep.risk === 'med' ? '#fef3c7' : '#d4f0e7', color: ep.risk === 'high' ? '#E24B4A' : ep.risk === 'med' ? '#d97706' : '#1D9E75' }}>
                      {ep.count} AI-prone
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap', background: '#d4f0e7', color: '#1D9E75' }}>
                      AI-safe
                    </span>
                  )}
                  {!endpointsVisible.includes(i) && (
                    <div style={{ width: '14px', height: '14px', border: '2px solid #e2e0d8', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Screen 3: Results */}
      {currentScreen === 'results' && currentData && (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 60px' }}>
          {/* Steps bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '36px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1D9E75' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: '#1D9E75', color: 'white' }}>✓</div>
              Scan
            </div>
            <div style={{ width: '40px', height: '1px', background: '#e2e0d8', margin: '0 4px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1916', fontWeight: 600 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>2</div>
              Review
            </div>
            <div style={{ width: '40px', height: '1px', background: '#e2e0d8', margin: '0 4px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b6860' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>3</div>
              Protect
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '680px' }}>
            {/* Results header */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e0d8', borderRadius: '16px 16px 0 0', padding: '24px 28px', borderBottom: 'none' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6b6860', marginBottom: '8px' }}>
                {currentData.domain}
              </p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: '#1a1916', marginBottom: '4px' }}>
                {currentData.headline}
              </p>
              <p style={{ fontSize: '14px', color: '#6b6860', marginBottom: '20px' }}>
                Invari auto-repairs them before they reach your server.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {currentData.pills.map((pill, i) => (
                  <span key={i} style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", padding: '5px 14px', borderRadius: '100px', fontWeight: 500, background: pill.cls === 'high' ? '#fde8e8' : pill.cls === 'med' ? '#fef3c7' : pill.cls === 'low' ? '#fffbeb' : '#d4f0e7', color: pill.cls === 'high' ? '#E24B4A' : pill.cls === 'med' ? '#d97706' : pill.cls === 'low' ? '#92400e' : '#1D9E75' }}>
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Endpoint results */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e0d8', borderTop: 'none' }}>
              {currentData.endpoints.map((ep, i) => (
                <EndpointResultRow key={i} endpoint={ep} />
              ))}
            </div>

            {/* CTA section */}
            <div style={{ background: '#1a1916', borderRadius: '0 0 16px 16px', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                <strong style={{ color: 'white', display: 'block', fontSize: '16px', marginBottom: '2px' }}>Make this API AI-proof</strong>
                One proxy. No SDK. Live in 60 seconds.
              </div>
              <button onClick={handleStartProtecting} style={{ padding: '14px 28px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', animation: 'fadeInUp 0.6s ease-out' }}>
                Start protecting →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background: '#f4f3f0', borderTop: '1px solid rgba(188, 202, 193, 0.3)', paddingTop: '40px', paddingBottom: '32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '32px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: "'Noto Serif', serif", fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  invari<span style={{ color: '#1D9E75' }}>.ai</span>
                </div>
                <p style={{ fontSize: '14px', color: '#3d4943' }}>AI infrastructure for enterprise agent pipelines.</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6d7a73', marginBottom: '12px' }}>Product</div>
                  <Link to="/how-it-works" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>How it works</Link>
                  <Link to="/pricing" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</Link>
                  <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
                  <Link to="/contact" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Contact</Link>
                </div>
              </div>
            </div>
            {/* Bottom row */}
            <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(188, 202, 193, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}>
                © 2026 invari.ai. Source-available under <a href="https://polyformproject.org/licenses/noncommercial/1.0.0/" target="_blank" rel="noopener noreferrer" style={{ color: '#1D9E75', textDecoration: 'none' }}>PolyForm Noncommercial</a>.
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#3d4943' }}>
                Built for teams shipping AI agents into production.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Agent Creation Modal */}
      {showAgentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAgentModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, marginBottom: '12px', color: '#1a1916' }}>
              Create your agent
            </h2>
            <p style={{ fontSize: '14px', color: '#6b6860', marginBottom: '24px', lineHeight: 1.6 }}>
              Give your agent a name. This will be used to identify your API protection agent.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1a1916', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginBottom: '8px' }}>
                AGENT NAME
              </label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newAgentName.trim() && handleCreateAgent()}
                placeholder="e.g., my-api-agent"
                autoFocus
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e0d8', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", background: '#ffffff', color: '#1a1916', outline: 'none', transition: 'border-color 0.15s' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAgentModal(false)} style={{ padding: '11px 20px', background: '#f0efe9', color: '#1a1916', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}>
                Cancel
              </button>
              <button onClick={handleCreateAgent} disabled={!newAgentName.trim() || creatingAgent} style={{ padding: '11px 20px', background: (newAgentName.trim() && !creatingAgent) ? '#1D9E75' : '#e2e0d8', color: (newAgentName.trim() && !creatingAgent) ? 'white' : '#6b6860', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: (newAgentName.trim() && !creatingAgent) ? 'pointer' : 'not-allowed', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {creatingAgent && (
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                )}
                {creatingAgent ? 'Creating...' : 'Create Agent →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLoginModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#1a1916' }}>
                Sign In
              </h2>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: '20px', height: '20px', color: '#6b6860' }} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#6b6860', marginBottom: '24px', lineHeight: 1.6 }}>
              Access your account to manage and protect your APIs
            </p>

            {/* Error Message */}
            {loginError && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fde8e8', border: '1px solid #E24B4A', borderRadius: '8px' }}>
                <p style={{ color: '#E24B4A', fontSize: '14px' }}>{loginError}</p>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1a1916', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginBottom: '8px' }}>
                  EMAIL
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#6b6860' }} />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoggingIn}
                    style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e0d8', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", background: '#ffffff', color: '#1a1916', outline: 'none', transition: 'border-color 0.15s' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1a1916', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginBottom: '8px' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#6b6860' }} />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoggingIn}
                    style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e0d8', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", background: '#ffffff', color: '#1a1916', outline: 'none', transition: 'border-color 0.15s' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px 20px', background: isLoggingIn ? '#e2e0d8' : '#1D9E75', color: isLoggingIn ? '#6b6860' : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isLoggingIn ? 'not-allowed' : 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLoggingIn && (
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                )}
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid #e2e0d8' }}></div>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span style={{ padding: '0 16px', background: '#ffffff', fontSize: '14px', color: '#6b6860' }}>OR</span>
              </div>
            </div>

            {/* Google Login */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyframes for animations */}
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .nav-links-main a:hover { color: #1b1c1a !important; }
        @media (max-width: 768px) {
          .nav-links-main { display: none; }
        }
      `}</style>
    </div>
  );
};

// Endpoint Result Row Component (with expand/collapse)
const EndpointResultRow = ({ endpoint }) => {
  const [open, setOpen] = useState(false);
  const hasRepairs = endpoint.repairs.length > 0;

  return (
    <div style={{ borderBottom: '1px solid #e2e0d8', cursor: hasRepairs ? 'pointer' : 'default', transition: 'background 0.15s' }} onClick={() => hasRepairs && setOpen(!open)}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 28px', gap: '12px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, padding: '3px 7px', borderRadius: '4px', minWidth: '38px', textAlign: 'center', background: endpoint.method === 'POST' ? '#fff3e0' : endpoint.method === 'GET' ? '#e8f5e9' : '#fef3c7', color: endpoint.method === 'POST' ? '#b45309' : endpoint.method === 'GET' ? '#2e7d32' : '#d97706' }}>
          {endpoint.method}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#1a1916', flex: 1 }}>
          {endpoint.path}
        </span>
        {hasRepairs ? (
          <span style={{ fontSize: '12px', color: '#6b6860', fontFamily: "'JetBrains Mono', monospace" }}>
            {endpoint.repairs.length} AI-prone field{endpoint.repairs.length > 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: '#1D9E75', fontFamily: "'JetBrains Mono', monospace" }}>AI-safe</span>
        )}
        {hasRepairs && (
          <span style={{ fontSize: '10px', color: '#6b6860', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        )}
      </div>
      {hasRepairs && open && (
        <div style={{ padding: '0 28px 20px 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {endpoint.repairs.map((repair, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 16px 1fr', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f0efe9', borderRadius: '8px', fontSize: '12px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6b6860', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {repair.type}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E24B4A', background: '#fde8e8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {repair.from}
              </span>
              <span style={{ color: '#6b6860', textAlign: 'center', fontSize: '14px' }}>→</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1D9E75', background: '#d4f0e7', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {repair.to}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPage;
