PAYLOADCMS FRAMEWORK (v3.86.0) - MULTI-TENANT PLUGIN (v3.86.0) KURULUMU
1- multi-tenant plugin install edilir: 'pnpm add @payloadcms/plugin-multi-tenant' 
   payload.config.ts dosyasında import edilir 'import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
   aynı dosyada 'buildConfig' metodu object parametresinde, array tipindeki 'plugins' dizisinde 'multiTenantPlugin' metodu çağrılıp konfigürasyonu object tipinde oluşturulup ayarlar set edilir.
2- Bu pluginin çalışması için 'tenant' koleksiyonu oluşturulmalıdır. tenant koleksiyonu oluşturulur ve plugin config'de 'tenantsSlug' degeri oluşturulan tenant koleksiyonun 'slug' değeri atanacak şekilde duzenlenir. 

ilk temel Tenant koleksiyonu örneği:
"""
import { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
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
"""

payload.config.ts'de multi-tenant plugin tanımlama örneği:
"""
plugins: [
    multiTenantPlugin({
      tenantsSlug: 'tenants',
      collections:{'posts':{}}, //'posts' diye bir koleksiyonun oldugunu varsayalim ve multi-tenant davranmasini isteyelim
    }),
  ],
"""

Uygulama 'pnpm dev' ile ilk kez çalıştırıldığında otomatik olarak DB'de 'users_tenants' tablosunun oluştuğu gözlemlenir. Admin paneli yüklenirken uygulama ilk kez çalıştırıldığı için giriş ekranından önce yeni kullanıcı oluşturma formu açılır. Bu formda ilk kullanıcıyı henüz herhangi bir tenant ile ilişkisi olmadan oluşturulur. Çünkü henüz tenant kaydı yok. Aynı zamanda henüz User koleksiyonunda 'role' düzenlemesi olmadığını da varsayarsak ve diğer tüm koleksiyonlarda kullanıcı bazlı kısıtlar olmadığını varsayarsak bu ilk kullanıcıyı 'admin' olarak düşünebiliriz. İlk kullanıcı bilgileri ile login olunduğunda Posts gibi (eğer oluşturulduysa) multi-tenant davranmasi planlanan koleksiyonlara ve yeni olusturdgumuz tenant koleksiyonuna bu ilk giris yapan kullanici admin panelinde erisemez. Default olarak proje ilk oluşturulduğunda gelen mevcut user ve media koleksiyonlarına eriştiği gözlemlenir. bu koleksiyonlara (user,media gibi) da hangi kullanicilarin erismesi gerektigi projenin ilerleyen safhalarinda tasarlanmalidir. multi-tenant özellikli bir projede users, tenants gibi koleksiyonların sadece sistem admini tarafından yönetilecek şekilde tasarlanmalıdır.

3- user koleksiyonunda sistem yöneticisi için role yapisi olusturulur. 'admin' ve 'user' rolleri tanımlanır. Bu roller herhangi bir tenanta bağlı olmayan, tenant ile ilişkisi olmayan kullanıcılar için atanır. Bunlar sistem yöneticisi kullanıcılarıdır.

Users koleksiyonunda ilk düzenleme:
"""
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
  ],
}
"""

4- Uygulama ilk calistirildiginda yeni kullanıcı oluşturma formu açılmaması için payload.config'de 'onInit' ayarlarında ilk user admin rolü ile düzenlenir. böylece uygulama ilk calistirilip veritabanı olusturuldugunda admin kullanıcısı default olarak olusturulur. 

payload.config'de onInit düzenlemesi:
"""
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
"""

5- Tenant koleksiyonuna CRUD işlemler yetkisi yalnızca admin rolünde olmalıdır. Bunun için Tenant koleksiyonu access control ayarları geliştirici tarafından ezilir, custom hale getirilir. Bunun için payload.config'de plugin ayarlarinda "useTenantsCollectionAccess:false" olarak ayarlanır. Böylece tenants koleksiyonu access control metotlarının varsayılan kullanımı devredışı bırakıp sistem admin ve tenant bazlı kullanıcılar için özelleştirilir
(best-practice) bu şekildedir. 

Tenant koleksiyonu access control metotları TenantAccess.ts:
"""
import { Access, AccessResult } from 'payload'

export const TenantReadAccess: Access = ({ req }): AccessResult => {
  // Admin tüm tenant'ları görebilir
  if (req.user?.role === 'admin') return true

  // Normal kullanıcı sadece kendi tenant'larını görebilir
  if (req.user?.tenants && req.user.tenants.length > 0) {
    // Kullanıcının tenant ID'lerini al
    const userTenantIds = req.user.tenants
      .map((t: any) => (typeof t.tenant === 'string' ? t.tenant : t.tenant?.id))
      .filter(Boolean)

    if (userTenantIds.length > 0) {
      return {
        id: {
          in: userTenantIds,
        },
      }
    }
  }

  // Hiçbir tenant'a bağlı değilse erişim verme
  return false
}

export const TenantCreateAccess: Access = ({ req }): AccessResult => {
  return req?.user?.role === 'admin'
}

export const TenantUpdateAccess: Access = ({ req }): AccessResult => {
  return req?.user?.role === 'admin'
}

export const TenantDeleteccess: Access = ({ req }): AccessResult => {
  return req?.user?.role === 'admin'
}
"""
Yukarıdaki kodlarda 'read' metodu 'admin' rolü dışında giriş yapmış kullanıcının ilişkili olduğu tenantları 'read' etmesini sağlar. Bu şunu içindir: tenant kullanıcısı birden fazla tenant ile ilişkili olabilir. Admin ekranında sol üst alanda 'tenant switcher' aktif hale gelir (eğer birden fazla tenant ile ilişkili olursa). işte bunun gibi kullanıcının hangi tenant ile ilişkisi olduğu bilgisinin tenant koleksiyonu üzerinden 'read' edilmesinin sağlanabilmesi gereklidir. Aksi durumda tenanta bağlı kullanıcı giriş yaptığında plugin yapısı user'ın hangi tenanta bağlı olduğunu okuyamaz. Bu yüzden tenant koleksiyonu access control read metodunda 'admin' rolü dışındaki giriş yapmış kullanıcıların tenant ile ilişkilerini okumasına izin verilir.

6- sistem admin rolünün yönetim panelinde tenants koleksiyonunu yönetebilmesi için tenants access control read metodu ayarlarında user.role=='admin' için tam yetki verilir (return true). böylece dashboard'da tenants koleksiyonu sistem admin tarafından yönetilmeye başlanır ve ilk tenantları ve tenant bazlı kullanıcıları oluşturur 

7- payload.config multi-tenant plugin ayarında 'userHasAccessToAllTenants' ayarı adeta  'god mode on' olarak davranmayı düzenler. Bu henüz ayarlanmazsa sistem admini yönetim paneline girdiğinde multi-tenant olarak çalışması planlanan koleksiyonları göremez, yönetemez. tenant'ı olmayan ilk kullanıcının (sistem admin) tenant ile ilişkili diğer koleksiyonlara erişebilmesi için 'userHasAccessToAllTenants' özelliği düzenlenir. Atanan metod 'user' parametresi alır ve user'ın role değeri üzerinden tüm multi-tenant bazlı çalışan koleksiyonlara tam erişim yetkisi düzenlenir. Böylece sistem admini tenants yönetimi ile birlikte tenant bazlı diğer koleksiyonlara erişimi sağlanır ve bu erişim tenant switch ile yönetilebildiği gözlemlenir.

payload.config'de multi-tenant pluginde 'userHasAccessToAllTenants' ayarlaması:
"""
userHasAccessToAllTenants: (user) => {
        if (user.role === 'admin') {
          return true;
        }
        return false;
      },
"""

8- tenant bazlı kullanıcının tenants koleksiyonunu admin panelinde görmemesi için tenants koleksiyonu admin ayarlarında tenants.admin hidden düzenlemesi yapılır.

Tenants koleksiyonunda düzenleme:
"""
admin: {
    hidden: ({ user }) => user?.role !== 'admin',
    useAsTitle: 'name',
  },
"""

9- plugin varsayılan çalışma şeklinde Users koleksiyonuna bizim görmediğimiz Tenants koleksiyonu alanlarını(Field) enjekte eder. Örneğin Users koleksiyonunda 5 adet field olduğunu varsayalım, multi-tenant plugini 6. field olarak arka planda user ve tenant koleksiyonları ilişkisini kurar. Böylece admin panelinde User form ekranında 6. fieldda kullanıcının atanacağı tenant alanları görünür. Eğer bu varsayılan düzene müdahale etmek gerekirse o zaman payload.config'de plugin ayarlarında 'tenantsArrayField' ayarını 'includeDefaultField:false' olarak düzenleriz. Bunu yaptığımızda Users koleksiyonunda 'import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'' import ederek kontrolü elimize alırız.

Bu custom düzenleme best-practice'de Users koleksiyonunda array tipinde ve içinde tenants ve role fieldlarının olduğu alanları içerir.
Bu bağlamda güncellenen Users koleksiyonu:
Users.ts:
"""
import type { CollectionConfig } from 'payload'
import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'

const customTenantsArrayField = tenantsArrayField({
  
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
"""

Sonuç: multi-tenant plugini kurulduğunda bir tenant koleksiyonu oluşturma, sistem adminini tasarlama, tenant koleksiyonuna erişimi düzenleme ve user koleksiyonu üzerinde tenant ile ilişkili diğer alanların custom olarak düzenlenmesi sağlanır.


