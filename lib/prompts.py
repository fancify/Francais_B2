"""
所有 prompt 常量数据 — 口语/写作/模考题目。
"""

from __future__ import annotations

# 口音字符（iPad 快捷输入用）
ACCENT_CHARS = ["é", "è", "ê", "ë", "à", "â", "î", "ï", "ô", "û", "ù", "ç"]

# ---------------------------------------------------------------------------
# 单元口语 Prompts
# ---------------------------------------------------------------------------
ORAL_PROMPTS: dict[int, str] = {
    1: "Argumentez pour ou contre l'interdiction des plastiques à usage unique dans votre ville.",
    2: "Pensez-vous que l'argent fait le bonheur ? Donnez des arguments pour et contre.",
    3: "Quel est le rôle de l'université dans l'insertion professionnelle ? Donnez votre avis.",
    4: "Les réseaux sociaux améliorent-ils ou détériorent-ils la communication ? Argumentez.",
    5: "Quel personnage historique admirez-vous le plus et pourquoi ?",
    6: "Décrivez votre voyage idéal et expliquez pourquoi ce lieu vous attire.",
    7: "Les médias traditionnels sont-ils encore fiables à l'ère du numérique ?",
    8: "La médecine préventive est-elle plus importante que la médecine curative ?",
    9: "Comment pourrait-on mieux partager les richesses dans la société ?",
    10: "La langue française est-elle menacée par l'anglais ? Argumentez.",
    11: "L'intelligence artificielle est-elle une menace ou une opportunité pour l'humanité ?",
    12: "L'art a-t-il un rôle thérapeutique ? Donnez des exemples concrets.",
}

# ---------------------------------------------------------------------------
# 单元写作 Prompts
# ---------------------------------------------------------------------------
WRITING_PROMPTS: dict[int, str] = {
    1: "Vous êtes membre d'une association écologique. Écrivez une lettre au maire pour proposer des mesures concrètes de protection de l'environnement dans votre ville. (250 mots minimum)",
    2: "Le paiement dématérialisé remplacera-t-il un jour l'argent liquide ? Rédigez un essai argumenté. (250 mots minimum)",
    3: "Les grandes écoles favorisent-elles la reproduction sociale ? Rédigez un essai argumenté. (250 mots minimum)",
    4: "Écrivez une lettre formelle au directeur d'un journal pour réagir à un article sur la cyberdépendance des jeunes. (250 mots minimum)",
    5: "Rédigez un article sur l'importance de connaître l'histoire pour comprendre le présent. (250 mots minimum)",
    6: "Écrivez un article pour un magazine de voyage comparant le tourisme de masse et le tourisme responsable. (250 mots minimum)",
    7: "Rédigez une lettre au rédacteur en chef d'un journal pour dénoncer la désinformation dans les médias. (250 mots minimum)",
    8: "Rédigez un essai argumenté : « Faut-il rendre obligatoire une visite médicale annuelle ? » (250 mots minimum)",
    9: "Écrivez un essai argumenté sur le partage des richesses et la solidarité dans la société moderne. (250 mots minimum)",
    10: "Rédigez un essai sur la place du français dans le monde face à la domination de l'anglais. (250 mots minimum)",
    11: "Rédigez un essai argumenté : « Le progrès technologique est-il toujours synonyme de progrès humain ? » (250 mots minimum)",
    12: "Écrivez une critique d'une œuvre d'art qui vous a particulièrement marqué(e). (250 mots minimum)",
}

# ---------------------------------------------------------------------------
# 模考写作 Prompts
# ---------------------------------------------------------------------------
EXAM_WRITING_PROMPTS: dict[int, str] = {
    1: "Vous écrivez au maire pour proposer des mesures écologiques concrètes pour votre quartier. (250 mots min.)",
    2: "Rédigez un essai argumenté : « Le paiement dématérialisé est-il un progrès ou un danger ? » (250 mots min.)",
    3: "Écrivez une lettre formelle au directeur d'une grande école pour défendre la diversité sociale. (250 mots min.)",
    4: "Rédigez un article : « Les réseaux sociaux nous rapprochent-ils ou nous isolent-ils ? » (250 mots min.)",
    5: "Écrivez un essai : « Peut-on comprendre le présent sans connaître l'histoire ? » (250 mots min.)",
    6: "Rédigez un courrier des lecteurs comparant tourisme de masse et tourisme responsable. (250 mots min.)",
    7: "Écrivez une lettre au rédacteur en chef dénonçant les fausses informations. (250 mots min.)",
    8: "Rédigez un essai : « La prévention vaut-elle mieux que la guérison ? » (250 mots min.)",
    9: "Écrivez un essai argumenté sur le partage des richesses dans la société. (250 mots min.)",
    10: "Rédigez un essai sur la défense de la langue française face à la mondialisation. (250 mots min.)",
    11: "Écrivez un essai : « Faut-il craindre ou espérer le progrès technologique ? » (250 mots min.)",
    12: "Rédigez une critique argumentée d'une œuvre d'art qui vous a marqué(e). (250 mots min.)",
}

# ---------------------------------------------------------------------------
# 模考口语 Prompts
# ---------------------------------------------------------------------------
EXAM_ORAL_PROMPTS: dict[int, str] = {
    1: "Présentez et défendez votre point de vue : « Les actions individuelles suffisent-elles face à la crise écologique ? »",
    2: "Débat : « L'argent est-il le principal moteur de la réussite ? » Présentez les deux côtés.",
    3: "Exposé : « L'égalité des chances dans l'éducation est-elle une réalité ou un mythe ? »",
    4: "Débat : « Internet a-t-il tué la vie privée ? » Argumentez.",
    5: "Exposé : « Les leçons de l'histoire peuvent-elles éviter les erreurs du futur ? »",
    6: "Présentez un point de vue : « Le voyage forme-t-il vraiment la jeunesse ? »",
    7: "Débat : « Les médias ont-ils encore un devoir d'objectivité ? »",
    8: "Exposé : « Jusqu'où doit aller la responsabilité individuelle en matière de santé ? »",
    9: "Débat : « Faut-il imposer un revenu maximum pour réduire les inégalités ? »",
    10: "Exposé : « Une langue universelle serait-elle une chance ou une perte culturelle ? »",
    11: "Débat : « L'intelligence artificielle doit-elle avoir des droits ? »",
    12: "Exposé : « L'art doit-il être utile pour avoir de la valeur ? »",
}
