# Sistem Admin Kurulum Kılavuzu

Bu doküman, multi-tenant bir yapıda (Payload CMS tabanlı) sistem admini kurulumu ve erişim kontrollerinin adım adım yapılandırılmasını içermektedir.

---

### 1. Multi-tenant Plugin Kurulumu
- Plugin'i projeye yükleyin (`npm install` veya benzeri).
- Plugin'i `payload.config` dosyasına import edin ve ilgili konfigürasyona ekleyin.

---

### 2. Tenant Koleksiyonu Oluşturma ve İlk Kullanıcı Aşaması
- Plugin konfigürasyonunda `tenantsSlug` değerini düzenleyerek tenant koleksiyonunu tanımlayın.
- Bu işlem sonrasında veritabanında otomatik olarak `users_tenants` tablosunun oluştuğunu gözlemleyin.
- **İlk çalıştırma durumu:** Uygulama ilk ayağa kalktığında `create-user` formu açılır. İlk kullanıcı, **herhangi bir tenant ilişkisi olmadan** oluşturulur.
- **Erişim gözlemi:** Bu kullanıcı login olduğunda;
  - Henüz oluşturulmadıysa `Posts` gibi tenant ilişkili koleksiyonlara erişemez.
  - `Users` ve `Media` koleksiyonlarına erişebildiği gözlemlenir.
- **Önemli Not:** `Users` koleksiyonu sadece sistem admin tarafından yönetilmelidir. Tenant bazlı diğer kullanıcıların bu koleksiyona `upsert` ve `delete` işlemleri kapatılmalıdır.

---

### 3. Role Yapısının Oluşturulması
- `Users` koleksiyonu içerisinde sistem yöneticisi için bir **role** yapısı oluşturun.
- `admin` ve `user` rollerini tanımlayın.
- Bu roller, **tenant'ı olmayan** kullanıcılar (yani sistem admin adayları) için atanacaktır.
- Sistem admin sayısı, birkaç kullanıcı ile sınırlı tutulmalıdır.

---

### 4. Varsayılan Sistem Admini Oluşturma
- `onInit` hook'u (veya başlangıç fonksiyonu) kullanarak varsayılan ilk kullanıcıyı **sistem admin (`admin`)** rolü ile düzenleyin/oluşturun.
- Böylece uygulama ilk ayağa kalkıp veritabanı oluşturulduğunda, sistem admin kullanıcı default olarak hazır olacaktır.

---

### 5. Access Control Özelleştirmesi (Best-Practice)
- `payload.config` dosyasında plugini şu şekilde ayarlayın:
  ```javascript
  useTenantsCollectionAccess: false
  ```
- Bu sayede `tenants` koleksiyonunun varsayılan access control metotları devre dışı bırakılır.
- Amaç, sistem admini **ve** tenant bazlı kullanıcılar için erişimi özelleştirmektir (best-practice yaklaşımı).

---

### 6. Sistem Admin'in Tenant Yönetimine Erişimi
- Tenant koleksiyonunun **access control `read`** metodunu düzenleyin.
- Sistem admin yetkisi için kural ekleyin:
  ```javascript
  if (user.role === 'admin') return true; // Tam yetki
  ```
- Bu düzenleme sonrasında sistem admin, dashboard üzerinden **tenants koleksiyonunu** yönetmeye başlayabilir ve ilk tenant'ları ile tenant bazlı kullanıcıları oluşturabilir.

---

### 7. Tenant ID Erişiminin Düzenlenmesi (Kritik Adım)
- Sistem admini için tenants koleksiyonunun `read` metodu override edildi.
- **Override öncesi varsayılan davranış:** Tenant'a bağlı kullanıcıların tenant bazlı koleksiyonlardaki işlemleri, tenant switch mekanizması ve kullanıcının bağlı olduğu tenant bilgisi bu metot üzerinden okunurdu.
- **Override sonrası yapılması gereken:** `req.user.tenants` verisi kontrol edilerek, kullanıcının bağlı olduğu `tenantId`'leri query olarak döndürülecek şekilde ayarlanmalıdır.
- **Uyarı:** Bu ayar yapılmazsa;
  - Kullanıcı tenant bazlı koleksiyonlarda işlem yürütemez.
  - Tenant switch mekanizması çalışmaz.

---

### 8. "God Mode" - Tüm Tenant'lara Erişim
- `userHasAccessToAllTenants` özelliğini devreye alın.
- Tenant'ı olmayan ilk kullanıcının (sistem admin), tenant ile ilişkili diğer koleksiyonlara erişebilmesi için `user` parametresindeki role değeri üzerinden yetki verin:
  ```javascript
  userHasAccessToAllTenants: (user) => user.role === 'admin'
  ```
- Bu ayar ile sistem admini;
  - Tenant yönetimine erişir,
  - Tenant bazlı diğer koleksiyonlara erişebilir,
  - Bu erişimin `tenant switch` ile yönetilebildiği gözlemlenir.

---

### 9. Tenant Koleksiyonunu Admin Panelinde Gizleme
- Tenant bazlı kullanıcıların (ör. `user` rolü) admin panelinde **tenants koleksiyonunu görmemesi** gerekir.
- Tenant koleksiyonunun admin ayarlarında `admin.hidden` düzenlemesi yapın:
  ```javascript
  admin: {
    hidden: (user) => user.role !== 'admin'
  }
  ```
- Bu sayede tenant koleksiyonu sadece `admin` rolüne sahip kullanıcılara gösterilir.

---

### 10. Tenants Array Field Yapılandırması
- Plugin'in `tenantsArrayField` ayarlamasını kullanarak `Users` koleksiyonu içinde **user-tenant ilişkisini** (array tipinde) düzenleyin.
- **Best-practice yaklaşımı:** `Users` koleksiyonunda array tipinde bir alan bulunur ve bu alan `tenants` ile `role` field'larını içerir.
- Bu yapılandırmayı sağlamak için `includeDefaultField: false` olarak ayarlayın ve `Users` koleksiyonunda `tenantsArrayField` export'unu kullanarak alanı manuel olarak düzenleyin.

---

## Özet / Kritik Hatırlatmalar
| Adım | Açıklama |
| :---: | :--- |
| 2 | İlk kullanıcı tenantsız oluşur, sadece user ve media'ya erişir. |
| 5 | `useTenantsCollectionAccess: false` ile access control tamamen özelleştirilir. |
| 7 | Tenant `read` metodu override edilirken `req.user.tenants` mutlaka sorguya eklenmelidir. |
| 8 | Sistem admini için `userHasAccessToAllTenants` aktif edilerek tüm tenant verilerine erişim sağlanır. |
| 10 | User-tenant ilişkisi için `tenantsArrayField` export edilerek manuel olarak eklenmelidir. |
