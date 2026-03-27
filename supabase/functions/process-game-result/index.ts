import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const BASE_POINTS: Record<number, Record<string, number>> = {
  4: { '1': 20, '2': 15, '3': 12, '4': 10, '5': 5, fail: 2 },
  5: { '1': 30, '2': 23, '3': 18, '4': 15, '5': 8, fail: 3 },
  6: { '1': 40, '2': 30, '3': 24, '4': 20, '5': 10, fail: 4 },
}

const SPEED_THRESHOLDS: Record<number, [number, number][]> = {
  4: [[15, 8], [30, 4], [60, 2]],
  5: [[20, 10], [40, 5], [75, 2]],
  6: [[25, 15], [50, 7], [90, 3]],
}

const STREAK_THRESHOLDS: Record<number, [number, number][]> = {
  4: [[30, 20], [7, 10], [3, 6], [2, 3]],
  5: [[30, 25], [7, 13], [3, 8], [2, 4]],
  6: [[30, 35], [7, 18], [3, 10], [2, 5]],
}

const SPEED_BADGE: Record<number, number> = { 4: 4, 5: 6, 6: 8 }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { player_id, level, word, attempts, solved, duration_seconds, first_green_attempt, session_id } = await req.json()

    if (!player_id || ![4, 5, 6].includes(level) || !word || typeof solved !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Ongeldige invoer' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const pts: { points: number; reason: string }[] = []
    const newBadges: any[] = []

    // 1. Insert game
    const { data: game } = await supabase
      .from('games')
      .insert({ player_id, level, word, attempts: solved ? (attempts || 1) : (attempts || 5), solved, duration_seconds: duration_seconds || 0, session_id, first_green_attempt })
      .select('id, played_at')
      .single()

    if (!game) {
      return new Response(JSON.stringify({ error: 'Kon spel niet opslaan' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Get player
    const { data: player } = await supabase.from('players').select('*').eq('id', player_id).single()
    if (!player) {
      return new Response(JSON.stringify({ error: 'Speler niet gevonden' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Base points
    const baseKey = solved ? String(attempts || 1) : 'fail'
    const basePoints = BASE_POINTS[level]?.[baseKey] || 0
    let gamePoints = basePoints
    pts.push({ points: basePoints, reason: solved ? `Geraden in poging ${attempts} (${level}-letter)` : `Deelnamebonus (${level}-letter)` })

    // 4. Speed bonus
    if (solved && duration_seconds != null) {
      for (const [maxTime, bonus] of SPEED_THRESHOLDS[level] || []) {
        if (duration_seconds < maxTime) {
          gamePoints += bonus
          pts.push({ points: bonus, reason: `Snelheidsbonus (<${maxTime}s)` })
          break
        }
      }
    }

    await supabase.from('games').update({ points_earned: gamePoints }).eq('id', game.id)

    // 5. Streak
    const today = new Date(game.played_at).toISOString().split('T')[0]
    await supabase.from('game_completions').upsert({ player_id, completed_date: today }, { onConflict: 'player_id,completed_date' })

    const { data: completions } = await supabase
      .from('game_completions')
      .select('completed_date')
      .eq('player_id', player_id)
      .order('completed_date', { ascending: false })
      .limit(400)

    let currentStreak = 0
    if (completions?.length) {
      const dates = new Set(completions.map((c: any) => c.completed_date))
      const todayDate = new Date(today)
      for (let i = 0; i < 400; i++) {
        const d = new Date(todayDate)
        d.setDate(d.getDate() - i)
        if (dates.has(d.toISOString().split('T')[0])) currentStreak++
        else break
      }
    }

    // 6. Streak bonus
    for (const [minDays, bonus] of STREAK_THRESHOLDS[level] || []) {
      if (currentStreak >= minDays) {
        pts.push({ points: bonus, reason: `Reeksbonus (${currentStreak} dagen)` })
        break
      }
    }

    const newTotalGames = (player.total_games_played || 0) + 1

    // 7. Daily bonuses
    const { count: todayCount } = await supabase
      .from('games').select('id', { count: 'exact', head: true })
      .eq('player_id', player_id)
      .gte('played_at', `${today}T00:00:00+00:00`)
      .lte('played_at', `${today}T23:59:59+00:00`)

    if ((todayCount || 0) <= 1) {
      pts.push({ points: 5, reason: 'Eerste spel van de dag' })
    }

    const { data: todayLevels } = await supabase
      .from('games').select('level')
      .eq('player_id', player_id)
      .gte('played_at', `${today}T00:00:00+00:00`)
      .lte('played_at', `${today}T23:59:59+00:00`)

    if (todayLevels) {
      const lvls = new Set(todayLevels.map((g: any) => g.level))
      if (lvls.has(4) && lvls.has(5) && lvls.has(6)) {
        const { count: alreadyGiven } = await supabase
          .from('points_log').select('id', { count: 'exact', head: true })
          .eq('player_id', player_id)
          .eq('reason', 'Alle drie niveaus gespeeld')
          .gte('created_at', `${today}T00:00:00+00:00`)
        if ((alreadyGiven || 0) === 0) {
          pts.push({ points: 20, reason: 'Alle drie niveaus gespeeld' })
        }
      }
    }

    // 8. Special one-time bonuses
    if (newTotalGames === 1) pts.push({ points: 10, reason: 'Eerste spel ooit' })
    if (newTotalGames === 100) pts.push({ points: 50, reason: '100e spel gespeeld' })
    if (newTotalGames === 500) pts.push({ points: 150, reason: '500e spel gespeeld' })

    if (solved && level === 5) {
      const { count } = await supabase.from('games').select('id', { count: 'exact', head: true })
        .eq('player_id', player_id).eq('level', 5).eq('solved', true).neq('id', game.id)
      if ((count || 0) === 0) pts.push({ points: 25, reason: 'Eerste gewonnen 5-letter spel' })
    }
    if (solved && level === 6) {
      const { count } = await supabase.from('games').select('id', { count: 'exact', head: true })
        .eq('player_id', player_id).eq('level', 6).eq('solved', true).neq('id', game.id)
      if ((count || 0) === 0) pts.push({ points: 40, reason: 'Eerste gewonnen 6-letter spel' })
    }

    // 9. Badge checking
    const { data: existingBadgesData } = await supabase.from('player_badges').select('badge_id').eq('player_id', player_id)
    const earnedIds = new Set((existingBadgesData || []).map((b: any) => b.badge_id))
    const { data: badgeDefs } = await supabase.from('badges').select('*')
    const badgeMap = new Map((badgeDefs || []).map((b: any) => [b.id, b]))

    const tryAward = (id: string) => {
      if (earnedIds.has(id)) return false
      const def = badgeMap.get(id)
      if (!def) return false
      earnedIds.add(id)
      newBadges.push(def)
      return true
    }

    const { data: allGames } = await supabase
      .from('games').select('level, solved, attempts, duration_seconds, played_at, session_id, first_green_attempt')
      .eq('player_id', player_id).order('played_at', { ascending: false }).limit(1000)
    const games = allGames || []

    // Tijd badges
    if (!earnedIds.has('nachtuil') && games.filter(g => { const h = new Date(g.played_at).getUTCHours(); return h >= 0 && h < 5 }).length >= 5) tryAward('nachtuil')
    if (!earnedIds.has('vroege_vogel') && games.filter(g => new Date(g.played_at).getUTCHours() < 7).length >= 5) tryAward('vroege_vogel')
    if (!earnedIds.has('maneschijn') && games.filter(g => new Date(g.played_at).getUTCHours() === 22).length >= 2) tryAward('maneschijn')
    if (!earnedIds.has('weekendstrijder')) {
      const wkd: Record<string, number> = {}
      games.forEach(g => { const d = new Date(g.played_at); if (d.getUTCDay() === 0 || d.getUTCDay() === 6) { const k = d.toISOString().split('T')[0]; wkd[k] = (wkd[k] || 0) + 1 } })
      if (Object.values(wkd).some(c => c >= 10)) tryAward('weekendstrijder')
    }

    // Reeks badges
    if (currentStreak >= 3) tryAward('op_dreef')
    if (currentStreak >= 7) tryAward('niet_te_stoppen')
    if (currentStreak >= 30) tryAward('ijzersterk')
    if (!earnedIds.has('maandmaster') && completions) {
      const dateSet = new Set(completions.map((c: any) => c.completed_date))
      const now = new Date()
      for (let m = 0; m < 12; m++) {
        const cm = new Date(now.getFullYear(), now.getMonth() - m, 1)
        const dim = new Date(cm.getFullYear(), cm.getMonth() + 1, 0).getDate()
        let ok = true
        for (let d = 1; d <= dim; d++) {
          const ds = `${cm.getFullYear()}-${String(cm.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          if (!dateSet.has(ds)) { ok = false; break }
        }
        if (ok) { tryAward('maandmaster'); break }
      }
    }

    // Vaardigheid badges
    if (!earnedIds.has('supersnel') && solved && duration_seconds < SPEED_BADGE[level]) tryAward('supersnel')
    if (!earnedIds.has('vlekkeloos') && solved && attempts === 1) tryAward('vlekkeloos')
    if (!earnedIds.has('comeback') && solved && first_green_attempt != null && first_green_attempt >= 4) tryAward('comeback')
    if (!earnedIds.has('meesterspeler')) {
      let cons = 0
      for (const g of games) { if (g.solved) { cons++; if (cons >= 10) { tryAward('meesterspeler'); break } } else cons = 0 }
    }

    // Sociaal badges
    if (!earnedIds.has('fair_play')) {
      const { data: chs } = await supabase.from('online_challenges').select('challenged_id, created_at').eq('challenger_id', player_id).limit(50)
      if (chs) for (const ch of chs) {
        const { data: cp } = await supabase.from('players').select('created_at').eq('id', ch.challenged_id).single()
        if (cp && (new Date(ch.created_at).getTime() - new Date(cp.created_at).getTime()) / 86400000 <= 2) { tryAward('fair_play'); break }
      }
    }
    if (!earnedIds.has('werver')) {
      const { data: fl } = await supabase.from('friends').select('friend_id').eq('player_id', player_id)
      if (fl && fl.length >= 3) {
        let af = 0
        for (const f of fl) {
          const { count } = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('player_id', f.friend_id)
          if ((count || 0) >= 1) af++
          if (af >= 3) { tryAward('werver'); break }
        }
      }
    }
    if (!earnedIds.has('feestbeest') && player.birthdate) {
      const bd = new Date(player.birthdate), td = new Date(today)
      if (bd.getMonth() === td.getMonth() && bd.getDate() === td.getDate()) tryAward('feestbeest')
    }
    if (!earnedIds.has('uitdager')) {
      const { count } = await supabase.from('online_matches').select('id', { count: 'exact', head: true })
        .or(`player1_id.eq.${player_id},player2_id.eq.${player_id}`)
      if ((count || 0) >= 5) tryAward('uitdager')
    }

    // Uithoudingsvermogen badges
    if (!earnedIds.has('marathonloper')) {
      const dc: Record<string, number> = {}
      games.forEach(g => { const k = new Date(g.played_at).toISOString().split('T')[0]; dc[k] = (dc[k] || 0) + 1 })
      if (Object.values(dc).some(c => c >= 10)) tryAward('marathonloper')
    }
    if (!earnedIds.has('golfrijder') && session_id && games.filter(g => g.session_id === session_id).length >= 5) tryAward('golfrijder')
    if (!earnedIds.has('onvermoeibaar')) {
      const wc: Record<string, number> = {}
      games.forEach(g => {
        const d = new Date(g.played_at)
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const wk = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
        const k = `${d.getFullYear()}-W${wk}`
        wc[k] = (wc[k] || 0) + 1
      })
      if (Object.values(wc).some(c => c >= 50)) tryAward('onvermoeibaar')
    }
    const newTotalHours = (player.total_hours_played || 0) + (duration_seconds || 0) / 3600
    if (!earnedIds.has('tijdloze') && newTotalHours >= 100) tryAward('tijdloze')

    // Prestige badges
    if (!earnedIds.has('alleskunner')) {
      const cats = new Set<string>()
      earnedIds.forEach(id => { const b = badgeMap.get(id); if (b && b.category !== 'Prestige') cats.add(b.category) })
      if (cats.size >= 5) tryAward('alleskunner')
    }
    if (!earnedIds.has('veteraan') && (Date.now() - new Date(player.created_at).getTime()) / 86400000 > 365 && newTotalGames > 100) tryAward('veteraan')
    if (!earnedIds.has('verzamelaar') && earnedIds.size >= 20) tryAward('verzamelaar')

    // Badge points
    for (const badge of newBadges) {
      pts.push({ points: badge.is_rare ? 20 : 5, reason: `Badge: ${badge.name}` })
      pts.push({ points: badge.points, reason: `Badge bonus: ${badge.name}` })
      const existingInCat = (existingBadgesData || []).filter((eb: any) => { const b = badgeMap.get(eb.badge_id); return b && b.category === badge.category })
      const batchInCat = newBadges.filter((nb: any) => nb.category === badge.category)
      if (existingInCat.length === 0 && batchInCat.indexOf(badge) === 0) {
        pts.push({ points: 10, reason: `Eerste badge: ${badge.category}` })
      }
      const allInCat = (badgeDefs || []).filter((b: any) => b.category === badge.category)
      if (allInCat.every((b: any) => earnedIds.has(b.id))) {
        pts.push({ points: 40, reason: `Categorie ${badge.category} compleet` })
      }
    }

    // Insert points
    const totalEarned = pts.reduce((s, e) => s + e.points, 0)
    if (pts.length > 0) {
      await supabase.from('points_log').insert(pts.map(e => ({ player_id, points: e.points, reason: e.reason, game_id: game.id })))
    }

    // Insert badges
    if (newBadges.length > 0) {
      await supabase.from('player_badges').insert(newBadges.map((b: any) => ({ player_id, badge_id: b.id })))
    }

    // Calculate total
    const { data: totalData } = await supabase.from('points_log').select('points').eq('player_id', player_id)
    const newTotalPoints = (totalData || []).reduce((s: number, e: any) => s + e.points, 0)

    // Legend check
    if (!earnedIds.has('legend')) {
      const { data: topPlayers } = await supabase.from('players').select('id, points').order('points', { ascending: false }).limit(20)
      if (topPlayers && topPlayers.length > 15) {
        const sorted = [...topPlayers].map(p => p.id === player_id ? { ...p, points: newTotalPoints } : p).sort((a, b) => b.points - a.points)
        const rank = sorted.findIndex(p => p.id === player_id)
        if (rank >= 0 && rank < 3) {
          const def = badgeMap.get('legend')
          if (def) {
            await supabase.from('player_badges').insert({ player_id, badge_id: 'legend' })
            await supabase.from('points_log').insert([
              { player_id, points: 20, reason: 'Badge: Legend', game_id: game.id },
              { player_id, points: def.points, reason: 'Badge bonus: Legend', game_id: game.id },
            ])
            newBadges.push(def)
          }
        }
      }
    }

    // Unlock checks
    let unlocked5 = player.unlocked_5letter || false
    if (!unlocked5) {
      const { data: fg } = await supabase.from('games').select('points_earned').eq('player_id', player_id).eq('level', 4)
      const fp = (fg || []).reduce((s: number, g: any) => s + (g.points_earned || 0), 0)
      if (fp >= 250) unlocked5 = true
      if (!unlocked5) {
        const catCounts: Record<string, number> = {}
        earnedIds.forEach(id => { const b = badgeMap.get(id); if (b) catCounts[b.category] = (catCounts[b.category] || 0) + 1 })
        if (earnedIds.size >= 4 && Object.keys(catCounts).length >= 2) unlocked5 = true
      }
      if (!unlocked5 && games.filter(g => g.solved && g.attempts === 1).length >= 5) unlocked5 = true
    }

    let unlocked6 = player.unlocked_6letter || false
    if (!unlocked6) {
      const cond1 = newTotalPoints >= 600
      const rare = [...earnedIds].filter(id => badgeMap.get(id)?.is_rare).length
      const normal = [...earnedIds].filter(id => !badgeMap.get(id)?.is_rare).length
      const cond2 = rare >= 1 || normal >= 8
      const cond3 = earnedIds.has('op_dreef')
      unlocked6 = cond1 && cond2 && cond3
    }

    const bestStreak = Math.max(player.best_streak || 0, currentStreak)

    await supabase.from('players').update({
      points: newTotalPoints,
      total_games_played: newTotalGames,
      total_hours_played: newTotalHours,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_played_date: today,
      unlocked_5letter: unlocked5,
      unlocked_6letter: unlocked6,
    }).eq('id', player_id)

    return new Response(JSON.stringify({
      game_id: game.id,
      points_earned: totalEarned,
      points_breakdown: pts,
      badges_earned: newBadges,
      new_total_points: newTotalPoints,
      current_streak: currentStreak,
      best_streak: bestStreak,
      unlocked_5letter: unlocked5,
      unlocked_6letter: unlocked6,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
