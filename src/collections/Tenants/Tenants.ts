import { CollectionConfig } from 'payload'

//Access Control
import {
  TenantReadAccess,
  TenantCreateAccess,
  TenantUpdateAccess,
  TenantDeleteccess,
} from './Access/TenantAccess'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    hidden: ({ user }) => user?.role !== 'admin',
    useAsTitle: 'name',
  },
  access: {
    read: TenantReadAccess,
    create: TenantCreateAccess,
    update: TenantUpdateAccess,
    delete: TenantDeleteccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'note',
      type: 'text',
    },
  ],
}
