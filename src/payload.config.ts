import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users/Users'
import { Media } from './collections/Media/Media'
import { Tenants } from './collections/Tenants/Tenants'
import { Categories } from './collections/Posts/Categories'
import { Posts } from './collections/Posts/Posts'

//plugins
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Tenants, Users, Media, Categories, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
    },
  }),
  sharp,

  onInit: async (payload) => {
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: 'admin@admin.com' } },
    })

    if (users.docs.length === 0) {
      // Kullanıcı yoksa oluştur ve tenant'a ata
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: 'admin@admin.com',
          password: 'q1w2e3',
          role:'admin'
        },
      })
      payload.logger.info(`Sistem admin kullanıcısı ${newUser.email} oluşturuldu`)
    }
  },
  plugins: [
    multiTenantPlugin({
      tenantsSlug: 'tenants',
      collections:{'categories':{}, 'posts':{}},
      
      //Bu seçenek ile tenant koleksiyonuna varsayılan erişim kontrolü kapatılır. Tenant koleksiyonu custom access controle geçilir
      useTenantsCollectionAccess:false, 
      
      cleanupAfterTenantDelete: false,
      

      //god mod:on
      userHasAccessToAllTenants: (user) => {
        if (user.role === 'admin') {
          return true;
        }
        return false;
      },

      tenantsArrayField:{
        //Users koleksiyonuna otomatik olarak array tipinde tenants enjekte eder
        //false ise Users koleksiyonuna UX konumlandırma manuel olarak düzenlenir
        includeDefaultField:false, //default true. 
      },
    }),
  ],
})
