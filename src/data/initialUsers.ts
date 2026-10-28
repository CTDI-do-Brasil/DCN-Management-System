import { User } from '../types';

export interface LocalAuthUser extends User {
  senha: string;
}

export const LEGACY_DEMO_USER_IDS = [
  'user-eng-01',
  'user-eng-02',
  'user-op-01',
  'user-op-02'
];

export const LEGACY_DEMO_USER_LOGINS = [
  'CARLOS.MENDES',
  'ANA.SILVA',
  'OPERADOR.CTDI',
  'MARCOS.SOUZA'
];

export const INITIAL_USERS: LocalAuthUser[] = [
  {
    id: 'user-admin-01',
    login: 'JONATAS.MIRANDA',
    nome: 'Jonatas Miranda',
    email: 'jmiranda@ctdi.com',
    role: 'ADMIN',
    senha: 'admin',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];
