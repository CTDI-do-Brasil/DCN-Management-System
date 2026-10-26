import { User } from '../types';

export interface LocalAuthUser extends User {
  senha: string;
}

export const INITIAL_USERS: LocalAuthUser[] = [
  {
    id: 'user-admin-01',
    login: 'JONATAS.MIRANDA',
    nome: 'Jonatas Miranda',
    role: 'ADMIN',
    senha: 'admin',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  {
    id: 'user-eng-01',
    login: 'CARLOS.MENDES',
    nome: 'Carlos Eduardo Mendes',
    role: 'ENGINEER',
    senha: '123456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'user-eng-02',
    login: 'ANA.SILVA',
    nome: 'Ana Carolina Silva',
    role: 'ENGINEER',
    senha: '123456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'user-op-01',
    login: 'OPERADOR.CTDI',
    nome: 'Operador de Linha CTDI',
    role: 'OPERATOR',
    senha: '123456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'user-op-02',
    login: 'MARCOS.SOUZA',
    nome: 'Marcos Souza',
    role: 'OPERATOR',
    senha: '123456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];
