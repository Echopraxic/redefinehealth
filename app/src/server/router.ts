import { NOT_FOUND, METHOD_NOT_ALLOWED } from './response.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export type RouteParams = Record<string, string>
export type RouteContext = { req: Request; params: RouteParams; searchParams: URLSearchParams }
export type RouteHandler = (ctx: RouteContext) => Promise<Response> | Response

interface Route {
    method: string
    regex: RegExp
    paramNames: string[]
    handler: RouteHandler
}

// -----------------------------------------------
// Router
// -----------------------------------------------

export class Router {
    private readonly routes: Route[] = []

    private register(method: string, path: string, handler: RouteHandler): void {
        const paramNames: string[] = []
        const regexSource = path
            .replace(/:([a-zA-Z_]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)' })
            .replace(/\//g, '\\/')
        this.routes.push({ method, regex: new RegExp(`^${regexSource}\\/?$`), paramNames, handler })
    }

    get(path: string, handler: RouteHandler): this  { this.register('GET',    path, handler); return this }
    post(path: string, handler: RouteHandler): this  { this.register('POST',   path, handler); return this }
    patch(path: string, handler: RouteHandler): this { this.register('PATCH',  path, handler); return this }
    del(path: string, handler: RouteHandler): this   { this.register('DELETE', path, handler); return this }

    dispatch(req: Request): Promise<Response> | Response {
        const url = new URL(req.url)
        const pathname = url.pathname

        const matchingRoutes = this.routes.filter(r => r.regex.test(pathname))

        if (matchingRoutes.length === 0) return NOT_FOUND

        const route = matchingRoutes.find(r => r.method === req.method)
        if (!route) return METHOD_NOT_ALLOWED

        const match = pathname.match(route.regex)!
        const params: RouteParams = {}
        for (let i = 0; i < route.paramNames.length; i++) {
            params[route.paramNames[i]!] = match[i + 1]!
        }

        return route.handler({ req, params, searchParams: url.searchParams })
    }
}
