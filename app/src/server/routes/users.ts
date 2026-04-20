import { ok, BAD_REQUEST, NOT_FOUND } from '../response.ts'
import { maskPhone } from '../../utils/phone-mask.ts'
import { validatePhone, validateHHMM } from '../../utils/validators.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { CreateUserInput, UserProfile } from '../../domain/user-profile.ts'

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function maskUser(user: UserProfile): UserProfile {
    return { ...user, phone: maskPhone(user.phone) }
}

function parseBody(req: Request): Promise<unknown> {
    return req.json().catch(() => null)
}

// -----------------------------------------------
// Factory — returns handlers bound to the repository
// -----------------------------------------------

export function makeUsersRoutes(users: UserRepository) {
    const listUsers: RouteHandler = () => {
        const all = users.findAll().map(maskUser)
        return ok({ users: all, total: all.length })
    }

    const getUser: RouteHandler = ({ params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND
        return ok(maskUser(user))
    }

    const createUser: RouteHandler = async ({ req }) => {
        const body = await parseBody(req) as Partial<CreateUserInput> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        const required: Array<keyof CreateUserInput> = ['phone', 'name', 'timezone', 'wakeTime', 'sleepTime', 'goals', 'preferences', 'stack', 'peptides']
        for (const field of required) {
            if (body[field] === undefined) return BAD_REQUEST(`Missing required field: ${field}`)
        }

        const input = body as CreateUserInput
        const phoneCheck = validatePhone(input.phone ?? '')
        if (!phoneCheck.valid) return BAD_REQUEST(phoneCheck.errors[0]!)
        const wakeCheck  = validateHHMM(input.wakeTime ?? '')
        if (!wakeCheck.valid)  return BAD_REQUEST(`wakeTime: ${wakeCheck.errors[0]}`)
        const sleepCheck = validateHHMM(input.sleepTime ?? '')
        if (!sleepCheck.valid) return BAD_REQUEST(`sleepTime: ${sleepCheck.errors[0]}`)
        if (!Array.isArray(input.goals) || input.goals.length === 0) return BAD_REQUEST('goals must be a non-empty array')

        try {
            const user = users.create(input)
            return ok(maskUser(user), 201)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            if (msg.includes('UNIQUE constraint')) return BAD_REQUEST('A user with that phone number already exists')
            throw e
        }
    }

    const updateUser: RouteHandler = async ({ req, params }) => {
        const existing = users.findById(params['id']!)
        if (!existing) return NOT_FOUND

        const body = await parseBody(req) as Partial<UserProfile> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        const allowed: Array<keyof UserProfile> = ['name', 'timezone', 'wakeTime', 'sleepTime', 'goals', 'preferences', 'stack', 'peptides']
        const updates: Partial<UserProfile> = {}
        for (const key of allowed) {
            if (body[key] !== undefined) (updates as Record<string, unknown>)[key] = body[key]
        }

        const updated = users.update(params['id']!, updates)
        return ok(maskUser(updated!))
    }

    const deleteUser: RouteHandler = ({ params }) => {
        const existing = users.findById(params['id']!)
        if (!existing) return NOT_FOUND
        users.delete(params['id']!)
        return ok({ deleted: true, id: params['id'] })
    }

    return { listUsers, getUser, createUser, updateUser, deleteUser }
}
