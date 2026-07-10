import type { CollectionConfig } from 'payload'
import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'

const customTenantsArrayField = tenantsArrayField({
  // arrayFieldAccess: {
  //   update: ({ req }) => Boolean(req.user),
  // },
  // tenantFieldAccess: {
  //   read: () => true,
  // },
  rowFields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: ['editor', 'viewer'],
    },
  ],
})

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'admin', value: 'admin' },
        { label: 'user', value: 'user' },
      ],
      admin: {
        description: 'Sistem rolü (tenant olmayan kullanıcı)',
      },
    },
    customTenantsArrayField
    
  ],
}
