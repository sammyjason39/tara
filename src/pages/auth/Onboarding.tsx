import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { COUNTRIES, getCountry } from "@/lib/countries";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    industry: "retail",
    country: "US",
    address: "",
    latitude: 0,
    longitude: 0,
    google_place_id: "",
    formatted_address: "",
    geofence_radius: 200,
  });
  const selectedCountry = getCountry(formData.country);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { provisionCompany } = useAuth();
  const navigate = useNavigate();

  const handleProvision = async () => {
    setError("");
    setLoading(true);

    const result = await provisionCompany(formData);
    if (result.success) {
      navigate("/core/dashboard");
    } else {
      setError(
        result.error || "Failed to provision company. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl opacity-40 blur-[100px] pointer-events-none -z-10">
        <div className="aspect-[2/1] bg-gradient-to-tr from-blue-200 via-indigo-200 to-purple-200 rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Set up your workspace
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
          We'll provision a dedicated cloud environment tailored to your
          operation structure.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-white/80 backdrop-blur-md py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100/50 transition-all duration-300">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
            <div className="hidden sm:grid grid-cols-2 text-xs font-medium text-gray-500 mt-2 text-center">
              <span className={step >= 1 ? "text-indigo-600" : ""}>
                Company Details
              </span>
              <span className={step >= 2 ? "text-indigo-600" : ""}>
                Provisioning
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-start">
              <svg
                className="w-5 h-5 mr-3 flex-shrink-0 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    placeholder="Acme Corporation"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Office / HQ Address
                </label>
                <div className="mt-1">
                  <textarea
                    required
                    rows={3}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    placeholder="Enter full physical address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Geospatial Geofence Section */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Geospatial Anchoring
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full uppercase tracking-wider">
                    HQ Geofence
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-tight mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="0.0000"
                      value={formData.latitude || ""}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-tight mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="0.0000"
                      value={formData.longitude || ""}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-tight mb-1 flex justify-between">
                    <span>Geofence Radius</span>
                    <span className="text-indigo-600 font-bold">{formData.geofence_radius}m</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={formData.geofence_radius}
                    onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Industry
                </label>
                <div className="mt-1">
                  <select
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                  >
                    <option value="retail">Retail & Merchandising</option>
                    <option value="fnb">Food & Beverage (Restaurant)</option>
                    <option value="services">Professional Services</option>
                    <option value="tech">Technology / SaaS</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="healthcare">Healthcare & Medical</option>
                    <option value="logistics">Logistics & Supply Chain</option>
                    <option value="education">Education & Training</option>
                    <option value="finance">Financial Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Operation Region
                </label>
                <div className="mt-1">
                  <select
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Live Currency Preview */}
                  {selectedCountry && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/50">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedCountry.flag} {selectedCountry.name}
                      </span>
                      <span className="text-indigo-300">•</span>
                      <span className="text-sm font-bold text-indigo-700">
                        {selectedCountry.currency}
                      </span>
                      <span className="text-xs font-medium text-indigo-600/80">
                        — {selectedCountry.currencyName} (
                        {selectedCountry.symbol})
                      </span>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Your regional selection configures compliance datasets (e.g.
                    initial tax rates). You can override these freely later.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  disabled={!formData.name || !formData.address}
                  onClick={() => setStep(2)}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 py-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
                <svg
                  className="h-8 w-8 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>

              <h3 className="text-xl leading-6 font-medium text-gray-900 mb-2">
                Ready to Provision
              </h3>

              <div className="bg-gray-50 rounded-lg p-5 text-left text-sm mb-6 border border-gray-100">
                <div className="grid grid-cols-3 gap-y-3">
                  <div className="text-gray-500">Company Name</div>
                  <div className="col-span-2 font-medium text-gray-900">
                    {formData.name}
                  </div>

                  <div className="text-gray-500">Industry Profile</div>
                  <div className="col-span-2 font-medium text-gray-900 uppercase">
                    {formData.industry}
                  </div>

                  <div className="text-gray-500">Regulatory Baseline</div>
                  <div className="col-span-2 font-medium text-gray-900">
                    {selectedCountry?.flag} {selectedCountry?.name}
                  </div>

                  <div className="text-gray-500">HQ Address</div>
                  <div className="col-span-2 font-medium text-gray-900 line-clamp-2">
                    {formData.address}
                  </div>

                  <div className="text-gray-500">Coordinates</div>
                  <div className="col-span-2 font-medium text-gray-900">
                    {formData.latitude}, {formData.longitude}
                  </div>

                  <div className="text-gray-500">Fence Radius</div>
                  <div className="col-span-2 font-medium text-indigo-600 font-bold">
                    {formData.geofence_radius}m
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Clicking provision creates your isolated tenant partition and
                wires up the initial executive organization structure.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-1/3 flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProvision}
                  disabled={loading}
                  className="w-2/3 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating Workspace...
                    </>
                  ) : (
                    "Provision Environment"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
