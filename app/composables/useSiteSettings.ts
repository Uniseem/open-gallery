import type { SiteSettings } from '~/types/dashboard'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  title: 'Open Gallery',
  slogan: 'Frame the moments that matter.',
  author: 'Open Gallery',
  avatarUrl: '/web-app-manifest-192x192.png',
  theme: 'system',
}

let pendingSiteSettingsRequest: Promise<SiteSettings> | null = null

// 与后台重写前 useAdminApi 的 getAdminApiErrorMessage 同一优先级。那个模块已随后台迁到 admin/
// 被删除；Nuxt 自动导入不写 import 语句，残留调用在构建时不报错，只会在请求失败时抛 ReferenceError。
const requestErrorMessage = (requestError: unknown): string => {
  if (typeof requestError === 'string') return requestError
  if (!requestError || typeof requestError !== 'object') return '请求失败，请稍后重试'
  const candidate = requestError as { data?: { error?: string, message?: string }, message?: string }
  return candidate.data?.error || candidate.data?.message || candidate.message || '请求失败，请稍后重试'
}

export function useSiteSettings() {
  const settings = useState<SiteSettings>('chronoframe-site-settings', () => ({
    ...DEFAULT_SITE_SETTINGS,
  }))
  const loaded = useState<boolean>('chronoframe-site-settings-loaded', () => false)
  const loading = useState<boolean>('chronoframe-site-settings-loading', () => false)
  const error = useState<string>('chronoframe-site-settings-error', () => '')

  const applySiteSettings = (value: SiteSettings) => {
    settings.value = {
      title: value.title?.trim() || DEFAULT_SITE_SETTINGS.title,
      slogan: value.slogan?.trim() || '',
      author: value.author?.trim() || '',
      avatarUrl: value.avatarUrl?.trim() || DEFAULT_SITE_SETTINGS.avatarUrl,
      theme: ['light', 'dark', 'system'].includes(value.theme) ? value.theme : 'system',
    } as SiteSettings
    loaded.value = true
    error.value = ''
    return settings.value
  }

  const refreshSiteSettings = async (): Promise<SiteSettings> => {
    if (pendingSiteSettingsRequest) return await pendingSiteSettingsRequest
    loading.value = true
    error.value = ''
    pendingSiteSettingsRequest = $fetch<SiteSettings>('/api/settings/site', {
      credentials: 'include',
    })
      .then(applySiteSettings)
      .catch((requestError) => {
        error.value = requestErrorMessage(requestError)
        throw requestError
      })
      .finally(() => {
        loading.value = false
        pendingSiteSettingsRequest = null
      })
    return await pendingSiteSettingsRequest
  }

  const ensureSiteSettings = async (): Promise<SiteSettings> => {
    if (loaded.value) return settings.value
    return await refreshSiteSettings()
  }

  return {
    settings,
    loaded,
    loading,
    error,
    applySiteSettings,
    refreshSiteSettings,
    ensureSiteSettings,
  }
}
