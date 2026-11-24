'use client';import {createContext,useContext} from 'react';export const ShellSession=createContext<string|null>(null);export const useShellUid=()=>useContext(ShellSession);
