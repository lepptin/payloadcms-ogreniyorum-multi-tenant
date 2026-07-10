import { Access, AccessResult } from 'payload'

export const TenantReadAccess: Access = ({ req }): AccessResult => {
  // Admin tüm tenant'ları görebilir
  if (req.user?.role === 'admin') return true

  // Normal kullanıcı sadece kendi tenant'larını görebilir
  if (req.user?.tenants && req.user.tenants.length > 0) {
    // Kullanıcının tenant ID'lerini al
    console.log('user tenants:', req.user.tenants)
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
