import { getPayload } from 'payload'
import config from '@payload-config'

/** Cached Payload Local API client for use inside Server Components. */
export const getClient = async () => getPayload({ config: await config })
