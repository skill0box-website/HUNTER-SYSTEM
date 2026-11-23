import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useHunterSounds } from "../hooks/useHunterSounds";

const { width } = Dimensions.get("window");



const RANKS = [
  { name: "E", label: "Rookie", minXP: 0, color: "#888780", bg: "#F1EFE8", bounty: 0 },
  { name: "D", label: "Prospect", minXP: 500000, color: "#3B6D11", bg: "#EAF3DE", bounty: 50000 },
  { name: "C", label: "Semi-Pro", minXP: 1000000, color: "#185FA5", bg: "#E6F1FB", bounty: 200000 },
  { name: "B", label: "Aspirant Draft", minXP: 1500000, color: "#534AB7", bg: "#EEEDFE", bounty: 600000 },
  { name: "A", label: "Joueur Confirmé", minXP: 2000000, color: "#993C1D", bg: "#FAECE7", bounty: 1500000 },
  { name: "S", label: "All-Star", minXP: 2500000, color: "#BA7517", bg: "#FAEEDA", bounty: 4000000 },
  { name: "SS", label: "Elite", minXP: 3000000, color: "#993556", bg: "#FBEAF0", bounty: 10000000 },
  { name: "SSS", label: "Monarch du Parquet", minXP: 3500000, color: "#A32D2D", bg: "#FCEBEB", bounty: 50000000 },
];

const LEVEL_XP = 50000;
const MATCH_XP = { points: 10, rebounds: 8, assists: 15, steals: 20, blocks: 18 };
const TRAIN_XP = { shots_made: 5, sets: 30, duration: 2, intensity: 40 };

const MATCH_BONUSES = [
  { id: "double_double", label: "Double-Double", xp: 5000, icon: "⚔️" },
  { id: "triple_double", label: "Triple-Double", xp: 12000, icon: "👑" },
  { id: "perfect", label: "Match Parfait", xp: 3000, icon: "✨" },
  { id: "clutch", label: "Clutch Q4", xp: 6000, icon: "🔥" },
];

const TRAIN_BONUSES = [
  { id: "pb", label: "Nouveau Record", xp: 8000, icon: "🏆" },
  { id: "full", label: "Session Complète", xp: 3000, icon: "💯" },
  { id: "double", label: "Double Session", xp: 5000, icon: "⚡" },
];

const C = {
  black: "#0A0A0A", navy: "#0D1B2A", glacier: "#4FC3F7",
  white: "#F5F5F5", gold: "#C9A84C", bg: "#111318",
  card: "#1A1F2E", border: "#2A2F3E", text: "#F5F5F5", sub: "#8899AA"
};

type MatchStatKey = "points" | "rebounds" | "assists" | "steals" | "blocks";
type TrainStatKey = "shots_made" | "sets" | "duration";
type Mode = "match" | "train";
type ViewName = "dashboard" | "ajouter" | "historique" | "rangs";

type MatchForm = Record<MatchStatKey, string> & { bonuses: string[] };
type TrainForm = Record<TrainStatKey, string> & { intensity: string; bonuses: string[] };

type SessionBase = {
  id: number;
  xp: number;
  date: string;
  rankedUp: boolean;
  leveledUp: boolean;
  newRank: string;
  newLevel: number;
};

type MatchSession = SessionBase & {
  type: "match";
  points: string;
  rebounds: string;
  assists: string;
  steals: string;
  blocks: string;
  bonuses: string[];
};

type TrainSession = SessionBase & {
  type: "train";
  shots_made: string;
  sets: string;
  duration: string;
  intensity: string;
  bonuses: string[];
};

type Session = MatchSession | TrainSession;

type NotificationData = {
  msg: string;
  sub?: string;
  color?: string;
};

type RankWithIndex = (typeof RANKS)[number] & { index: number };

type ProgressBarProps = {
  progress: number;
  color: string;
  height?: number;
};

type NotifOverlayProps = {
  notif: NotificationData | null;
  onDone: () => void;
};

function getRank(xp: number): RankWithIndex {
  for (let i = RANKS.length - 1; i >= 0; i--)
    if (xp >= RANKS[i].minXP) return { ...RANKS[i], index: i };
  return { ...RANKS[0], index: 0 };
}

function getLevel(xp: number): number { return Math.floor(xp / LEVEL_XP) + 1; }

function fmtXP(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v}`;
}

function fmtBounty(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(0)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

function ProgressBar({ progress, color, height = 5 }: ProgressBarProps) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
      <View style={{ height, borderRadius: height, width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
    </View>
  );
}

function NotifOverlay({ notif, onDone }: NotifOverlayProps) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notif) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDone);
    }, 2500);
    return () => clearTimeout(t);
  }, [notif]);

  if (!notif) return null;
  return (
    <Modal transparent animationType="none">
      <Animated.View style={[s.notifBg, { opacity }]}>
        <Animated.View style={[s.notifBox, { transform: [{ scale }] }]}>
          <Text style={{ fontSize: 48, textAlign: "center" }}>⚔️</Text>
          <Text style={[s.notifTitle, { color: notif.color || C.glacier }]}>{notif.msg}</Text>
          {notif.sub ? <Text style={s.notifSub}>{notif.sub}</Text> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const initMatch: MatchForm = { points: "", rebounds: "", assists: "", steals: "", blocks: "", bonuses: [] };
const initTrain: TrainForm = { shots_made: "", sets: "", duration: "", intensity: "3", bonuses: [] };

const MATCH_FIELDS: { key: MatchStatKey; label: string; xp: number }[] = [
  { key: "points", label: "Points", xp: MATCH_XP.points },
  { key: "rebounds", label: "Rebonds", xp: MATCH_XP.rebounds },
  { key: "assists", label: "Passes déc.", xp: MATCH_XP.assists },
  { key: "steals", label: "Interceptions", xp: MATCH_XP.steals },
  { key: "blocks", label: "Contres", xp: MATCH_XP.blocks },
];

const TRAIN_FIELDS: { key: TrainStatKey; label: string; xp: number }[] = [
  { key: "shots_made", label: "Tirs réussis", xp: TRAIN_XP.shots_made },
  { key: "sets", label: "Séries", xp: TRAIN_XP.sets },
  { key: "duration", label: "Durée (min)", xp: TRAIN_XP.duration },
];

export default function App() {
  const [totalXP, setTotalXP] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [view, setView] = useState<ViewName>("ajouter");
  const [mode, setMode] = useState<Mode>("match");
  const [matchForm, setMatchForm] = useState<MatchForm>(initMatch);
  const [trainForm, setTrainForm] = useState<TrainForm>(initTrain);
  const [notif, setNotif] = useState<NotificationData | null>(null);
  const playSound = useHunterSounds();

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [[, savedXP], [, savedSessions]] = await AsyncStorage.multiGet(["hunter_totalXP", "hunter_sessions"]);
        if (savedXP) setTotalXP(JSON.parse(savedXP));
        if (savedSessions) setSessions(JSON.parse(savedSessions) as Session[]);
      } catch (e) {
        console.log("Erreur chargement données sauvegardées", e);
      }
      setLoaded(true);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("hunter_totalXP", JSON.stringify(totalXP)).catch(() => {});
  }, [totalXP, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("hunter_sessions", JSON.stringify(sessions)).catch(() => {});
  }, [sessions, loaded]);

  const rank = getRank(totalXP);
  const nextRank = RANKS[rank.index + 1];
  const level = getLevel(totalXP);
  const levelPct = ((totalXP % LEVEL_XP) / LEVEL_XP) * 100;
  const rankPct = nextRank ? ((totalXP - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100 : 100;
  const bounty = rank.bounty + Math.floor(totalXP * 0.05);

  function calcXP(f: MatchForm | TrainForm, isMatch: boolean): number {
    let xp = 0;
    if (isMatch) {
      const match = f as MatchForm;
      xp += (parseInt(match.points, 10) || 0) * MATCH_XP.points;
      xp += (parseInt(match.rebounds, 10) || 0) * MATCH_XP.rebounds;
      xp += (parseInt(match.assists, 10) || 0) * MATCH_XP.assists;
      xp += (parseInt(match.steals, 10) || 0) * MATCH_XP.steals;
      xp += (parseInt(match.blocks, 10) || 0) * MATCH_XP.blocks;
      match.bonuses.forEach((bonusId) => {
        const bonus = MATCH_BONUSES.find((item) => item.id === bonusId);
        if (bonus) xp += bonus.xp;
      });
    } else {
      const train = f as TrainForm;
      xp += (parseInt(train.shots_made, 10) || 0) * TRAIN_XP.shots_made;
      xp += (parseInt(train.sets, 10) || 0) * TRAIN_XP.sets;
      xp += (parseInt(train.duration, 10) || 0) * TRAIN_XP.duration;
      xp += (parseInt(train.intensity, 10) || 0) * TRAIN_XP.intensity;
      train.bonuses.forEach((bonusId) => {
        const bonus = TRAIN_BONUSES.find((item) => item.id === bonusId);
        if (bonus) xp += bonus.xp;
      });
    }
    return xp;
  }

  const previewXP = mode === "match" ? calcXP(matchForm, true) : calcXP(trainForm, false);

  function handleSubmit() {
    const isMatch = mode === "match";
    const xp = calcXP(isMatch ? matchForm : trainForm, isMatch);
    if (xp === 0) return;
    const oldRank = getRank(totalXP);
    const oldLevel = getLevel(totalXP);
    const newTotal = totalXP + xp;
    const newRank = getRank(newTotal);
    const newLevel = getLevel(newTotal);
    setTotalXP(newTotal);
    const sessionBase: SessionBase = {
      id: Date.now(),
      xp,
      date: new Date().toLocaleDateString("fr-FR"),
      rankedUp: newRank.index > oldRank.index,
      leveledUp: newLevel > oldLevel,
      newRank: newRank.name,
      newLevel,
    };
    const newSession: Session = isMatch
      ? { ...sessionBase, type: "match", ...matchForm }
      : { ...sessionBase, type: "train", ...trainForm };
    setSessions((previousSessions) => [newSession, ...previousSessions]);
    if (isMatch) setMatchForm(initMatch); else setTrainForm(initTrain);
    if (newRank.index > oldRank.index) { setNotif({ msg: `RANG ${newRank.name} !`, sub: newRank.label.toUpperCase(), color: newRank.color }); playSound("rank"); }
    else if (newLevel > oldLevel) { setNotif({ msg: `LEVEL ${newLevel} !`, sub: `+${fmtXP(xp)} XP`, color: C.glacier }); playSound("level"); }
    else { setNotif({ msg: `+${fmtXP(xp)} XP`, sub: `Level ${newLevel}`, color: "#3B6D11" }); playSound("xp"); }
  }

  function toggleBonus(id: string, isMatch: boolean) {
    if (isMatch) setMatchForm(f => ({ ...f, bonuses: f.bonuses.includes(id) ? f.bonuses.filter(x => x !== id) : [...f.bonuses, id] }));
    else setTrainForm(f => ({ ...f, bonuses: f.bonuses.includes(id) ? f.bonuses.filter(x => x !== id) : [...f.bonuses, id] }));
  }

  const matchSessions = sessions.filter((session): session is MatchSession => session.type === "match");

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <NotifOverlay notif={notif} onDone={() => setNotif(null)} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>HUNTER SYSTEM</Text>
          <Text style={s.headerTitle}>DAWELBEIT</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.headerSub}>PRIME</Text>
          <Text style={[s.headerTitle, { color: C.gold, fontSize: 16 }]}>{fmtBounty(bounty)}</Text>
        </View>
      </View>


      {/* Rank Card */}
      <View style={[s.rankCard, { borderColor: rank.color }]}>
        <View style={[s.rankBadge, { backgroundColor: rank.color }]}>
          <Text style={[s.rankBadgeText, { fontSize: rank.name.length > 2 ? 11 : 18 }]}>
            {rank.name}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.row}>
            <Text style={[s.rankLabel, { color: rank.color }]}>{rank.label}</Text>
            <Text style={s.sub}>{fmtXP(totalXP)} XP</Text>
          </View>

          <Text style={[s.sub, { marginTop: 6, marginBottom: 2 }]}>RANG</Text>
          <ProgressBar progress={rankPct} color={rank.color} />

          <View style={s.row}>
            <Text style={[s.sub, { marginTop: 6, marginBottom: 2 }]}>
              LVL {level}
            </Text>
            <Text style={[s.sub, { marginTop: 6, marginBottom: 2 }]}>
              {fmtXP(totalXP % LEVEL_XP)} / {fmtXP(LEVEL_XP)}
            </Text>
          </View>

          <ProgressBar progress={levelPct} color={C.glacier} />

          {nextRank && (
            <Text style={[s.sub, { marginTop: 4 }]}>
              {fmtXP(nextRank.minXP - totalXP)} XP → Rang {nextRank.name}
            </Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        {[
          { l: "Matchs", v: matchSessions.length },
          { l: "Sessions", v: sessions.filter(s => s.type === "train").length },
          { l: "Points", v: matchSessions.reduce((a, s) => a + (parseInt(s.points) || 0), 0) },
          { l: "Rebonds", v: matchSessions.reduce((a, s) => a + (parseInt(s.rebounds) || 0), 0) },
          { l: "Passes", v: matchSessions.reduce((a, s) => a + (parseInt(s.assists) || 0), 0) },
          { l: "Level", v: level },
        ].map(item => (
          <View key={item.l} style={s.statBox}>
            <Text style={s.sub}>{item.l}</Text>
            <Text style={s.statVal}>{item.v}</Text>
          </View>
        ))}
      </View>

      {/* Nav */}
      <View style={s.nav}>
        {(["ajouter", "historique", "rangs"] as const).map(v => (
          <TouchableOpacity
            key={v}
            style={[s.navBtn, view === v && s.navBtnActive]}
            onPress={() => setView(v)}
          >
            <Text style={[s.navBtnText, view === v && s.navBtnTextActive]}>
              {v === "ajouter" ? "+ Session" : v === "historique" ? "Historique" : "Rangs"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu des écrans */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >

        {/* VIEW: Ajouter */}
        {view === "ajouter" && (
          <View style={s.card}>
            {/* Mode toggle */}
            <View style={s.modeRow}>
              {(["match", "train"] as const).map(m => (
                <TouchableOpacity key={m} style={[s.modeBtn, mode === m && { borderColor: m === "match" ? "#534AB7" : "#185FA5", backgroundColor: m === "match" ? "#1A1830" : "#0E1F30" }]} onPress={() => setMode(m)}>
                  <Text style={[s.modeBtnText, mode === m && { color: m === "match" ? "#534AB7" : "#185FA5", fontWeight: "700" }]}>
                    {m === "match" ? "🏀 Match" : "⚡ Entraînement"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "match" && (
              <>
                <View style={s.formGrid}>
                  {MATCH_FIELDS.map(item => (
                    <View key={item.key} style={s.formField}>
                      <Text style={s.fieldLabel}>{item.label} <Text style={{ color: "#3B6D11" }}>+{item.xp}</Text></Text>
                      <TextInput style={s.input} keyboardType="numeric" placeholder="0" placeholderTextColor={C.sub} value={matchForm[item.key]} onChangeText={t => setMatchForm(f => ({ ...f, [item.key]: t }))} />
                    </View>
                  ))}
                </View>
                <Text style={s.bonusTitle}>BONUS</Text>
                <View style={s.formGrid}>
                  {MATCH_BONUSES.map(b => (
                    <TouchableOpacity key={b.id} style={[s.bonusBtn, matchForm.bonuses.includes(b.id) && { borderColor: "#534AB7", backgroundColor: "#1A1830" }]} onPress={() => toggleBonus(b.id, true)}>
                      <Text style={[s.bonusBtnLabel, matchForm.bonuses.includes(b.id) && { color: "#534AB7" }]}>{b.icon} {b.label}</Text>
                      <Text style={s.bonusBtnXP}>+{fmtXP(b.xp)} XP</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {mode === "train" && (
              <>
                <View style={s.formGrid}>
                  {TRAIN_FIELDS.map(item => (
                    <View key={item.key} style={s.formField}>
                      <Text style={s.fieldLabel}>{item.label} <Text style={{ color: "#3B6D11" }}>+{item.xp}</Text></Text>
                      <TextInput style={s.input} keyboardType="numeric" placeholder="0" placeholderTextColor={C.sub} value={trainForm[item.key]} onChangeText={t => setTrainForm(f => ({ ...f, [item.key]: t }))} />
                    </View>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Intensité</Text>
                <View style={[s.row, { gap: 6, marginBottom: 12 }]}>
                  {[1,2,3,4,5].map(n => (
                    <TouchableOpacity key={n} style={[s.intensityBtn, trainForm.intensity === String(n) && { borderColor: C.glacier, backgroundColor: "#0E1F30" }]} onPress={() => setTrainForm(f => ({ ...f, intensity: String(n) }))}>
                      <Text style={[s.intensityBtnText, trainForm.intensity === String(n) && { color: C.glacier, fontWeight: "700" }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.bonusTitle}>BONUS</Text>
                <View style={s.formGrid}>
                  {TRAIN_BONUSES.map(b => (
                    <TouchableOpacity key={b.id} style={[s.bonusBtn, trainForm.bonuses.includes(b.id) && { borderColor: "#185FA5", backgroundColor: "#0E1F30" }]} onPress={() => toggleBonus(b.id, false)}>
                      <Text style={[s.bonusBtnLabel, trainForm.bonuses.includes(b.id) && { color: "#185FA5" }]}>{b.icon} {b.label}</Text>
                      <Text style={s.bonusBtnXP}>+{fmtXP(b.xp)} XP</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={s.submitRow}>
              <View>
                <Text style={s.sub}>XP cette session</Text>
                <Text style={[s.statVal, { fontSize: 26, color: mode === "match" ? "#534AB7" : "#185FA5" }]}>+{fmtXP(previewXP)}</Text>
              </View>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: mode === "match" ? "#534AB7" : "#185FA5" }]} onPress={handleSubmit}>
                <Text style={s.submitBtnText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* VIEW: Historique */}
        {view === "historique" && (
          <View style={{ gap: 8 }}>
            {sessions.length === 0 ? (
              <Text style={[s.sub, { textAlign: "center", marginTop: 32 }]}>Aucune session. Lance-toi ⚔️</Text>
            ) : sessions.map(sess => (
              <View key={sess.id} style={[s.sessionCard, sess.rankedUp && { borderLeftColor: "#A32D2D", borderLeftWidth: 3 }, sess.leveledUp && !sess.rankedUp && { borderLeftColor: C.glacier, borderLeftWidth: 3 }]}>
                <View style={s.row}>
                  <Text style={[s.sub, { fontWeight: "700", color: sess.type === "match" ? "#534AB7" : "#185FA5" }]}>
                    {sess.type === "match" ? "🏀 MATCH" : "⚡ ENTRAÎNEMENT"}
                  </Text>
                  <Text style={[s.statVal, { fontSize: 15, color: sess.type === "match" ? "#534AB7" : "#185FA5" }]}>+{fmtXP(sess.xp)}</Text>
                </View>
                <Text style={[s.sub, { marginTop: 3 }]}>
                  {sess.type === "match"
                    ? `${sess.points||0}pts · ${sess.rebounds||0}reb · ${sess.assists||0}ast · ${sess.steals||0}int · ${sess.blocks||0}cnt`
                    : `${sess.shots_made||0} tirs · ${sess.sets||0} séries · ${sess.duration||0}min · Intensité ${sess.intensity}/5`}
                </Text>
                <View style={[s.row, { marginTop: 5 }]}>
                  <Text style={s.sub}>{sess.date}</Text>
                  <View style={s.row}>
                    {sess.rankedUp && <View style={s.badge}><Text style={[s.badgeText, { color: "#A32D2D" }]}>Rang {sess.newRank} ⬆️</Text></View>}
                    {sess.leveledUp && <View style={[s.badge, { backgroundColor: "#0E1F30", borderColor: C.glacier }]}><Text style={[s.badgeText, { color: C.glacier }]}>Level {sess.newLevel} ⬆️</Text></View>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* VIEW: Rangs */}
        {view === "rangs" && (
          <View style={{ gap: 7 }}>
            <View style={s.levelInfoCard}>
              <View>
                <Text style={[s.sub, { color: C.glacier }]}>LEVEL ACTUEL</Text>
                <Text style={{ fontSize: 32, fontWeight: "800", color: C.white }}>{level}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.sub, { color: C.glacier }]}>PROCHAIN LEVEL</Text>
                <Text style={{ fontSize: 13, color: C.white }}>{fmtXP(LEVEL_XP - (totalXP % LEVEL_XP))} XP</Text>
              </View>
            </View>
            {RANKS.map((r, i) => {
              const active = rank.index === i;
              const unlocked = totalXP >= r.minXP;
              return (
                <View key={r.name} style={[s.rankRow, active && { borderColor: r.color, borderWidth: 1.5 }, !unlocked && { opacity: 0.4 }]}>
                  <View style={[s.rankBadge, { backgroundColor: r.color, width: 38, height: 38 }]}>
                    <Text style={[s.rankBadgeText, { fontSize: r.name.length > 2 ? 9 : 14 }]}>{r.name}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rankLabel, { color: r.color, fontSize: 13 }]}>{r.label}</Text>
                    <Text style={s.sub}>{fmtXP(r.minXP)} XP — {r.bounty > 0 ? fmtBounty(r.bounty) : "N/A"}</Text>
                  </View>
                  {active && <View style={[s.badge, { borderColor: r.color }]}><Text style={[s.badgeText, { color: r.color }]}>Actuel</Text></View>}
                  {!unlocked && <Text style={{ fontSize: 16 }}>🔒</Text>}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 48 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerSub: { fontSize: 10, color: C.sub, letterSpacing: 1.5 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.white },
  rankCard: { flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: C.card, borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  rankBadge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  rankBadgeText: { color: "#fff", fontWeight: "800" },
  rankLabel: { fontSize: 15, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  statBox: { width: (width - 32 - 14) / 3, backgroundColor: C.card, borderRadius: 10, padding: 10, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "700", color: C.white, marginTop: 2 },
  nav: { flexDirection: "row", gap: 6, marginBottom: 12 },
  navBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: C.border, alignItems: "center" },
  navBtnActive: { backgroundColor: C.card },
  navBtnText: { fontSize: 12, color: C.sub },
  navBtnTextActive: { color: C.white, fontWeight: "600" },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: C.border },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, alignItems: "center" },
  modeBtnText: { fontSize: 13, color: C.sub },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  formField: { width: (width - 32 - 28 - 8) / 2 },
  fieldLabel: { fontSize: 11, color: C.sub, marginBottom: 4 },
  input: { backgroundColor: "#0D1220", borderRadius: 8, borderWidth: 0.5, borderColor: C.border, color: C.white, fontSize: 15, paddingHorizontal: 10, paddingVertical: 8 },
  bonusTitle: { fontSize: 11, color: C.sub, fontWeight: "700", letterSpacing: 1, marginBottom: 7 },
  bonusBtn: { width: (width - 32 - 28 - 8) / 2, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: "#0D1220" },
  bonusBtnLabel: { fontSize: 11, fontWeight: "600", color: C.white },
  bonusBtnXP: { fontSize: 10, color: "#3B6D11", marginTop: 2 },
  intensityBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  intensityBtnText: { fontSize: 13, color: C.sub },
  submitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.border },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sessionCard: { backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.border },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5, borderColor: "#A32D2D", backgroundColor: "#1A0A0A" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  levelInfoCard: { backgroundColor: C.navy, borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sub: { fontSize: 11, color: C.sub },
  notifBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center" },
  notifBox: { alignItems: "center", paddingHorizontal: 32 },
  notifTitle: { fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 10, letterSpacing: 2 },
  notifSub: { fontSize: 14, color: C.sub, textAlign: "center", marginTop: 6 },
});