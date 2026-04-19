// -----------------------------------------------
// Abstract protocol interface
// All protocol modules implement this contract.
// -----------------------------------------------

export interface ProtocolContext {
    userId: string
    phone: string
    name: string
    timezone: string
    wakeTime: string    // HH:MM
    sleepTime: string   // HH:MM
}

export interface ProtocolMessage {
    phone: string
    content: string
    scheduledAt: Date
    /** Unique tag identifying this message type within the protocol */
    tag: string
    /** 'once' = schedule once; 'daily' = scheduleRecurring daily */
    recurrence: 'once' | 'daily' | 'weekly'
}

export interface Protocol<TConfig = Record<string, unknown>> {
    readonly protocolName: string
    /** Returns all scheduled messages for this protocol */
    buildSchedule(ctx: ProtocolContext, config: TConfig): ProtocolMessage[]
    /** Returns a one-time welcome message sent on protocol activation */
    buildWelcomeMessage(ctx: ProtocolContext, config: TConfig): string
}
