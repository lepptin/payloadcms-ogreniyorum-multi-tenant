## 📋 SKILL: payloadcms-multitenant-setup

### Metadata
| Alan | Değer |
|------|-------|
| **Ad** | `payloadcms-multitenant-setup` |
| **Versiyon** | 1.0.0 |
| **Hedef Framework** | PayloadCMS v3.86.0+ |
| **Plugin** | `@payloadcms/plugin-multi-tenant` v3.86.0+ |
| **Tip** | Kurulum + Best Practice Yapılandırma |
| **Dil** | Türkçe (kodlar İngilizce) |

### Açıklama
Bu skill, PayloadCMS v3.x projelerinde resmi `@payloadcms/plugin-multi-tenant` pluginini kurar, sistem admin yapısını oluşturur, tenant koleksiyonu üzerinde özelleştirilmiş access control kuralları tanımlar ve user koleksiyonunda tenant ilişki alanlarını best-practice şekilde yapılandırır.

---

## 🎯 Ne Zaman Kullanılır

- Yeni bir PayloadCMS projesi başlatıldığında
- Çok kiracılı (multi-tenant) mimari gerektiğinde
- Sistem seviyesi admin ve tenant seviyesi kullanıcı ayrımı yapılmak istendiğinde

---

## 🧱 Önkoşullar

```
- PayloadCMS v3.x projesi başlatılmış olmalı
- Veritabanı bağlantısı yapılandırılmış olmalı
- Koleksiyonlar (collections) klasör yapısı hazır olmalı
- Multi-tenant bazlı çalışacak basit bir koleksiyon önden hazır olmalı: Posts.ts (title, body alanları yeterli)
```

---

## 📐 Mimari Genel Bakış

```
┌─────────────────────────────────────────────┐
│         SİSTEM SEVİYESİ (admin)             │
│  • admin rolünde kullanıcılar               │
│  • Tüm tenant'lara erişim                   │
│  • Tenant bazlı koleksiyonları yönetir      │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Tenant A        │   │  Tenant B        │
│  • kendi users   │   │  • kendi users   │
│  • kendi posts   │   │  • kendi posts   │
└──────────────────┘   └──────────────────┘
```

---

## 🚀 ADIM ADIM KURULUM

### ADIM 1 — Plugin Kurulumu ve Konfigürasyonu

**Hedef:** Multi-tenant pluginini proje bağımlılıklarına eklemek ve `payload.config.ts` dosyasında yapılandırmak.

**1.1 — Paketi yükle:**
```bash
pnpm add @payloadcms/plugin-multi-tenant
```

**1.2 — `payload.config.ts` dosyasında import et:**
```ts
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
```

**1.3 — `buildConfig` içindeki `plugins` dizisine ekle (ilk versiyon):**
```ts
plugins: [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    collections: {
      'posts': {},  // multi-tenant davranacak koleksiyonlar
    },
  }),
],
```

> ⚠️ Bu ayar `payload.config.ts` dosyasında başka bir yerde yapılandırma olmadığını varsayar.

---

### ADIM 2 — Tenant Koleksiyonu Oluşturma

**Hedef:** Multi-tenant altyapısının temel taşı olan `tenants` koleksiyonunu oluşturmak.

**`src/collections/Tenants.ts` dosyası oluştur:**

```ts
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
```

**Kontrol Listesi:**
- ✅ `slug: 'tenants'` — plugin'in `tenantsSlug` ayarıyla eşleşmeli
- ✅ `admin.hidden` — tenant bazlı kullanıcılar bu koleksiyonu görmesin
- ✅ `access` metotları — sonraki adımda eklenecek

> 📌 **Not:** `admin.hidden` kuralı ile tenant kullanıcıları admin panelinde bu koleksiyonu göremez. Ancak API üzerinden `read` işlemi `TenantReadAccess` tarafından kontrol edilir.

---

### ADIM 2.1 — Multi-Tenant Çalışan Örnek Posts Koleksiyonu Oluşturma

**Hedef:** Multi-tenant çalışmaya hazır örnek posts koleksiyonu olan `multitenantposts` koleksiyonunu oluşturmak.

**`src/collections/MultiTenantPosts.ts` dosyası oluştur:**

```ts
import { CollectionConfig } from 'payload'

export const MultiTenantPosts: CollectionConfig = {
  slug: 'multitenantposts',
  admin: { useAsTitle: 'title' },

  fields: [
    { name: 'title', type: 'text'},
    { name: 'body', type: 'text' },
  ]
}

```

### ADIM 3 — Access Control Kurallarını Tanımlama

**Hedef:** Tenant koleksiyonunda CRUD işlemlerinin yetkilendirmesini, **best-practice** olarak admin ve tenant bazlı kullanıcılar için ayrı ayrı özelleştirmek.

**`src/collections/Access/TenantAccess.ts` dosyası oluştur:**

```ts
import { Access, AccessResult } from 'payload'

export const TenantReadAccess: Access = ({ req }): AccessResult => {
  // Admin tüm tenant'ları görebilir
  if (req.user?.role === 'admin') return true

  // Normal kullanıcı sadece kendi tenant'larını görebilir
  if (req.user?.tenants && req.user.tenants.length > 0) {
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
```

**`payload.config.ts` dosyasında plugin ayarını güncelle:**
```ts
plugins: [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    useTenantsCollectionAccess: false,  // ← KRİTİK: Custom access control'ı aktifleştirir
    collections: {
      'multitenantposts': {},
    },
  }),
],
```

**Access Control Kurallarının Mantığı:**

| Metod | Admin | Tenant Bazlı Kullanıcı |
|-------|-------|------------------------|
| `read` | ✅ Tüm tenant'lar | ✅ Sadece kendi tenant'ları |
| `create` | ✅ | ❌ |
| `update` | ✅ | ❌ |
| `delete` | ✅ | ❌ |

> 💡 **Neden `read` tenant bazlı kullanıcıya açık?**
> Çünkü plugin yapısı, kullanıcının hangi tenant'a bağlı olduğunu okumak için tenant koleksiyonuna `read` erişimine ihtiyaç duyar. Birden fazla tenant ile ilişkili kullanıcılarda **tenant switcher**'ın çalışabilmesi için bu izin zorunludur [2].

---

### ADIM 4 — Sistem Admin Rolünün Tanımlanması

**Hedef:** Tenant ile ilişkisi olmayan, sistem seviyesi yönetici için `role` alanını User koleksiyonuna eklemek.

**`src/collections/Users.ts` dosyası (ilk versiyon):**

```ts
import type { CollectionConfig } from 'payload'

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
```

**Açıklama:**
- `role: 'admin'` → Tenant ile ilişkisi olmayan sistem yöneticisi
- `role: 'user'` → Diğer sistem kullanıcıları
- Tenant bazlı kullanıcıların rolleri ayrı bir array field içinde tutulacak (bir sonraki adım)

---

### ADIM 5 — Default Admin Kullanıcısının Otomatik Oluşturulması

**Hedef:** İlk çalıştırmada admin oluşturma formunu atlayıp, sistem adminini otomatik oluşturmak.

**`payload.config.ts` dosyasında:**

```ts
export default buildConfig({
  // ... diğer ayarlar
  onInit: async (payload) => {
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: 'admin@admin.com' } },
    })

    if (users.docs.length === 0) {
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: 'admin@admin.com',
          password: 'q1w2e3',
          role: 'admin'
        },
      })
      payload.logger.info(`Sistem admin kullanıcısı ${newUser.email} oluşturuldu`)
    }
  },
  // ...
})
```

> 🔐 **Güvenlik Notu:** Üretim ortamında bu şifre ortam değişkeninden alınmalıdır.

---

### ADIM 6 — Sistem Admininin Tüm Tenant'lara Erişimi

**Hedef:** `userHasAccessToAllTenants` ayarı ile sistem adminini "god mode" olarak tanımlamak.

**`payload.config.ts` plugin tanımını güncelle:**

```ts
plugins: [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    useTenantsCollectionAccess: false,
    userHasAccessToAllTenants: (user) => {
      if (user.role === 'admin') {
        return true
      }
      return false
    },
    collections: {
      'multitenantposts': {},
    },
  }),
],
```

**Bu ayar olmadan ne olur?**
- Sistem admini multi-tenant koleksiyonları göremez
- Tenant bazlı verilere erişemez
- Admin paneli boş görünür

**Bu ayar ile:**
- Sistem admini tüm tenant verilerine tam erişim kazanır
- Tenant switcher'da tüm tenant'lar arasında geçiş yapabilir

---

### ADIM 7 — User Koleksiyonunda Custom Tenants Array Field

**Hedef:** Plugin'in varsayılan olarak enjekte ettiği tenants ilişki alanını özelleştirmek. Böylece her tenant için ayrı ayrı rol tanımlanabilir.

**`src/collections/Users.ts` dosyası (final versiyon):**

```ts
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
```

**Plugin config'de varsayılan alanı kapat:**
```ts
plugins: [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    useTenantsCollectionAccess: false,
    userHasAccessToAllTenants: (user) => user.role === 'admin',
    tenantsArrayField: {
      includeDefaultField: false,  // ← Plugin'in default field'ını kapat
    },
    collections: {
      'multitenantposts': {},
    },
  }),
],
```

**Field Yapısı:**

```
Users
├── email (default)
├── password (default)
├── role (system)         → admin | user (tenant ile ilişkisi olmayan)
└── tenants (array)
    ├── tenant → (relation to Tenants)
    └── roles  → ['editor', 'viewer'] (her tenant için ayrı yetki)
```

---

## ✅ DOĞRULAMA ADIMLARI

Skill uygulandıktan sonra aşağıdaki kontroller yapılmalıdır:

### Kurulum Sonrası Kontrol Listesi

| # | Kontrol | Beklenen Sonuç |
|---|---------|----------------|
| 1 | `pnpm dev` ile uygulamayı başlat | DB'de `users_tenants` tablosu otomatik oluşmalı |
| 2 | Login ekranında `admin@admin.com` ile giriş yap | Sistem admin rolü ile giriş başarılı |
| 3 | Admin panelinde `Tenants` koleksiyonu | Görünür ve CRUD yapılabilir |
| 4 | Yeni bir tenant oluştur | Tenant kaydı başarıyla oluşmalı |
| 5 | MultiTenantPosts koleksiyonu | Görünür ve üzerinde işlem yapılabilir |
| 6 | Tenant kullanıcısı oluştur | User formunda tenants array field görünmeli |

---

## 📂 Dosya Yapısı Özeti

```
src/
├── collections/
│   ├── Access/
│   │   └── TenantAccess.ts          # [2] Access control kuralları
│   ├── Tenants.ts                   # [1] Tenant koleksiyonu
│   └── Users.ts                     # [3] User koleksiyonu + tenants array
└── payload.config.ts                # Plugin konfigürasyonu
```

---

## 🔗 REFERANSLAR

Bu skill dokümanı aşağıdaki referans dosyalara dayanır:

- **Tenants.ts** — Tenant koleksiyonu ve admin yapılandırması [1]
- **TenantAccess.ts** — Tenant CRUD işlemleri için özelleştirilmiş access control kuralları [2]
- **Users.ts** — Sistem admin ve tenant bazlı kullanıcı yapısı, özelleştirilmiş tenants array field [3]

---