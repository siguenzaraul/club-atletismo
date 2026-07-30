import type { Access, FieldAccess } from 'payload'

/** Staff (the `users` collection) carry roles; members never reach the admin. */
export const isStaff = (user: unknown): user is { collection: 'users'; roles?: string[] } =>
  Boolean(user && (user as { collection?: string }).collection === 'users')

export const isAdmin: Access = ({ req: { user } }) =>
  isStaff(user) && Boolean(user.roles?.includes('admin'))

export const isAdminOrEditor: Access = ({ req: { user } }) =>
  isStaff(user) && Boolean(user.roles?.some((r) => r === 'admin' || r === 'editor'))

/** Field-level: only admins may edit (e.g. the roles field itself). */
export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  isStaff(user) && Boolean(user.roles?.includes('admin'))

/** Field-level: admins or editors may edit. */
export const isAdminOrEditorFieldLevel: FieldAccess = ({ req: { user } }) =>
  isStaff(user) && Boolean(user.roles?.some((r) => r === 'admin' || r === 'editor'))

/** Anyone can read (public-facing content). */
export const anyone: Access = () => true

/**
 * Staff see everything; a logged-in member sees only their own documents.
 * `ownerField` is the field on the doc that references the member id.
 */
export const adminOrOwn =
  (ownerField = 'member'): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (isAdminOrEditor({ req: { user } } as Parameters<Access>[0])) return true
    if (user.collection === 'members') return { [ownerField]: { equals: user.id } }
    return false
  }
