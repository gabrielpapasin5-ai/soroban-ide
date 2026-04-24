import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const DeployContext = createContext(null);

const STORAGE_KEY = "soroban_deploy_state";

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

// Transient statuses like "running" must never be restored on reload —
// the backend job that flipped the status to "running" is long gone once
// the page reloads, so we'd be stuck forever waiting for a completion event
// that can't arrive.
const sanitizeStatus = (s) => (s === "running" ? null : s || null);

export const DeployProvider = ({ children }) => {
  const saved = load();

  const [defaultWallet, setDefaultWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [compileStatus, setCompileStatus] = useState(sanitizeStatus(saved.compileStatus));
  const [deployStatus, setDeployStatus] = useState(sanitizeStatus(saved.deployStatus));
  const [deployedContractId, setDeployedContractId] = useState(saved.deployedContractId || null);
  const [contractFunctions, setContractFunctions] = useState(saved.contractFunctions || []);
  const [validationResult, setValidationResult] = useState(null);

  // Persist whenever key state changes. We deliberately write "null" in
  // place of "running" so that an interrupted build (runner restart, tab
  // close, etc.) doesn't leave the panel wedged in the RUNNING badge.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      compileStatus: compileStatus === "running" ? null : compileStatus,
      deployStatus: deployStatus === "running" ? null : deployStatus,
      deployedContractId,
      contractFunctions,
    }));
  }, [compileStatus, deployStatus, deployedContractId, contractFunctions]);

  const resetDeploy = useCallback(() => {
    setCompileStatus(null);
    setDeployStatus(null);
    setDeployedContractId(null);
    setContractFunctions([]);
  }, []);

  return (
    <DeployContext.Provider value={{
      defaultWallet, setDefaultWallet, walletLoading, setWalletLoading,
      compileStatus, setCompileStatus,
      deployStatus, setDeployStatus,
      deployedContractId, setDeployedContractId,
      contractFunctions, setContractFunctions,
      validationResult, setValidationResult,
      resetDeploy,
    }}>
      {children}
    </DeployContext.Provider>
  );
};

export const useDeploy = () => {
  const ctx = useContext(DeployContext);
  if (!ctx) throw new Error("useDeploy must be used within DeployProvider");
  return ctx;
};
