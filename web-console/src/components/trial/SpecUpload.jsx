import { useState, useRef } from "react";
import { Upload, Link } from "lucide-react";

/**
 * OpenAPI Spec Upload Component
 * Compact widget for file upload or URL fetch
 */
const SpecUpload = ({ onSubmit }) => {
  const [mode, setMode] = useState("file"); // 'file' | 'url'
  const [dragActive, setDragActive] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Popular public OpenAPI specs for demo
  const exampleSpecs = [
    {
      name: "Petstore API",
      url: "https://petstore3.swagger.io/api/v3/openapi.json",
      description: "19 endpoints",
    },
    {
      name: "HTTPBin API",
      url: "https://httpbin.org/spec.json",
      description: "15 endpoints",
    },
  ];

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Pass raw file content - engine will validate
      onSubmit({
        source: "file",
        filename: file.name,
        spec: e.target.result,
      });
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUrlFetch = async () => {
    if (!selectedUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(selectedUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch spec: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      let specContent;

      // Handle both JSON and YAML responses
      if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        specContent = JSON.stringify(json, null, 2);
      } else {
        specContent = await response.text();
      }

      // Extract filename from URL
      const urlParts = selectedUrl.split("/");
      const filename = urlParts[urlParts.length - 1] || "openapi-spec.json";

      onSubmit({
        source: "url",
        filename,
        spec: specContent,
        url: selectedUrl,
      });
    } catch (err) {
      setError(err.message || "Failed to fetch OpenAPI spec");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Widget */}
      <div className="bg-[#111] border border-[#222] rounded-[8px]-lg p-8">
        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("file");
              setError(null);
            }}
            className={`flex-1 px-6 py-3 border-2 rounded-[8px] font-medium transition-all flex items-center justify-center gap-2 ${
              mode === "file"
                ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                : "border-[#222] bg-[#0d0d0d] text-[#888] hover:border-[#444]"
            }`}
          >
            <Upload className="w-5 h-5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("url");
              setError(null);
            }}
            className={`flex-1 px-6 py-3 border-2 rounded-[8px] font-medium transition-all flex items-center justify-center gap-2 ${
              mode === "url"
                ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                : "border-[#222] bg-[#0d0d0d] text-[#888] hover:border-[#444]"
            }`}
          >
            <Link className="w-5 h-5" />
            Fetch from URL
          </button>
        </div>

        {/* File Upload Mode */}
        {mode === "file" && (
          <div
            className={`border-2 border-dashed rounded-[8px] p-12 text-center transition-colors ${
              dragActive
                ? "border-[#1D9E75] bg-[#1D9E75]/5"
                : "border-[#222] bg-[#0d0d0d]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-[#888]" />
            <p className="text-lg text-white mb-2">
              Drop your OpenAPI spec here
            </p>
            <p className="text-sm text-[#888] mb-4">or</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={(e) =>
                e.target.files[0] && handleFileUpload(e.target.files[0])
              }
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-[8px] font-medium hover:bg-[#222] transition-colors border border-[#222]"
            >
              Browse Files
            </button>
          </div>
        )}

        {/* URL Fetch Mode */}
        {mode === "url" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Select Example OpenAPI Spec
              </label>
              <select
                value={selectedUrl}
                onChange={(e) => {
                  setSelectedUrl(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 border border-[#222] rounded-[8px] focus:outline-none focus:border-[#1D9E75] text-white bg-[#0d0d0d]"
              >
                <option value="">Choose an example API...</option>
                {exampleSpecs.map((spec) => (
                  <option key={spec.url} value={spec.url}>
                    {spec.name} - {spec.description}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[8px]">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleUrlFetch}
              disabled={!selectedUrl || loading}
              className="w-full px-6 py-3 bg-[#1D9E75] hover:opacity-90 disabled:bg-[#222] disabled:text-[#666] text-white rounded-[8px] font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-[8px]-full animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Link className="w-5 h-5" />
                  Fetch Spec
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecUpload;
