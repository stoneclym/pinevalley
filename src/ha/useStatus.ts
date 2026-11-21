import { useEffect, useState } from "react";
import { type ConnectionStatus, getStatus, onStatus } from "./connection";

export function useConnectionStatus(): ConnectionStatus {
  const [s, setS] = useState(getStatus());
  useEffect(() => onStatus(setS), []);
  return s;
}
