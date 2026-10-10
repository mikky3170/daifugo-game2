/* ====================================================================
 * ROYAL DAIFUGO - scenario.js
 * [Version: v4.1.0 - ステージクリア時折れ線グラフ完全連動・PCログ直接格納＆自動退避版]
 * ==================================================================== */

const GUIDE_SPEAKER = '宮廷案内役';

const HERO_SPEAKER_KEY_MAP = {
  '織田信長': 'NOBUNAGA',
  '聖徳太子': 'SHOTOKU',
  '秦の始皇帝': 'SHI_HUANGDI',
  'アレクサンダー大王': 'ALEXANDER',
  'ギルガメッシュ': 'GILGAMESH'
};

const ScenarioManager = {
  isActive: false,
  isInitialized: false,
  currentSeatRoster: null,

  AVATARS: {
    boy: { id: 'boy', name: '少年 (Leo)', shortName: '少年', gender: 'male', type: '若き天才系', image: 'fugo-絵柄/boy.png', desc: '若くして頭角を現した天才勝負師。知性と野心を秘めたクールで鋭い眼差し。' },
    girl: { id: 'girl', name: '少女 (Iris)', shortName: '少女', gender: 'female', type: 'ミステリアス系', image: 'fugo-絵柄/girl.png', desc: '神秘的な瞳と淡いアッシュヘアの勝負師。場の流れを完全に見透かす直感を持つ。' },
    guy: { id: 'guy', name: '歴戦の男 (Gale)', shortName: '歴戦の男', gender: 'male', type: '熟練の勝負師系', image: 'fugo-絵柄/guy.png', desc: '数多の修羅場を潜り抜けてきたベテラン。渋みと包容力のある歴戦の顔つき。' },
    lady: { id: 'lady', name: '麗人 (Carmilla)', shortName: '麗人', gender: 'female', type: '妖艶ギャンブラー系', image: 'fugo-絵柄/lady.png', desc: '深紅とゴールドのドレスを纏う大人の女性。卓越した話術と駆け引きで勝負を支配する。' }
  },

  PRELIM_NOBLES: [
    {
      id: 'MARQUIS', name: '侯爵', gender: 'female', role: 'スマートパス重視派', icon: '🍷', img: 'fugo-絵柄/marquis.png',
      desc: 'ワインを嗜みながら優雅に立ち回る。無理な競り合いを避け、終盤に鋭い手を打つ。',
      startLine: 'ふふ、若き挑戦者さん。ワインを傾けながら優雅に参りましょう。無理な背伸びは火傷をなさいますわよ？',
      defeatLine: 'あら……スマートに流すつもりが、完全に押し切られてしまいましたわ。お見事ね。'
    },
    {
      id: 'COUNT', name: '伯爵', gender: 'male', role: 'フェーズ可変策略家', icon: '📜', img: 'fugo-絵柄/count.png',
      desc: '序盤は力を温存し、手札が減ると一気に牙を剥く。計算高い老練な策略家。',
      startLine: 'フッ、我が策略の盤面へようこそ。序盤の手応えだけで勝った気にならぬことだな。',
      defeatLine: 'まさか、我が後半の罠をすべて見切っていたというのか……！ 貴殿、只者ではないな。'
    },
    {
      id: 'DUKE', name: '公爵', gender: 'male', role: '強カード温存慎重派', icon: '👑', img: 'fugo-絵柄/duke.png',
      desc: '家門の誇りを胸に、ジョーカーや強カードを最後まで温存して手堅く勝機を狙う。',
      startLine: '我が公爵家の伝統に泥を塗るわけにはいかん。手堅く、そして揺るぎなき一手で迎え撃とう。',
      defeatLine: 'ぐぬっ……我が温存の防壁を破られるとは。名門の意地を上回る太刀筋、天晴れである！'
    },
    {
      id: 'STRATEGIST', name: '軍師', gender: 'male', role: '親権妨害コントロール', icon: '♟️', img: 'fugo-絵柄/strategist.png',
      desc: '相手の独走を絶対に許さない。的確な8切りと支配札で場の流れを支配する。',
      startLine: '盤上という戦場、勝敗は布陣の段階で決する。貴殿の思い通りには一歩も進ませぬよ。',
      defeatLine: '我が張り巡らせた包囲網がことごとく崩されたか……見事な戦術眼であった。'
    },
    {
      id: 'REVOLUTIONARY', name: '革命家', gender: 'male', role: '革命・8切り特化', icon: '🔥', img: 'fugo-絵柄/revolutionary.png',
      desc: '古い身分制度を覆すことに執念を燃やす。4枚出し革命と8切りを果敢に仕掛ける。',
      startLine: '古い秩序に守られた玉座など焼き尽くすまでだ！ 俺たちの変革の炎、消せると思うなよ！',
      defeatLine: 'ぐあああッ！ だがこの敗北すらも次の革命の種火よ……王宮の分厚い壁、必ずブチ破ってくれ！'
    },
    {
      id: 'KNIGHT', name: '騎士', gender: 'male', role: '愚直最弱順勝負', icon: '⚔️', img: 'fugo-絵柄/knight.png',
      desc: '騎士道精神に則り、愚直に弱いカードから真っ向勝負を挑む熱血漢。',
      startLine: '我が剣に誓って、小細工なしの真っ向勝負！ 騎士の誇り、受けて立つが良い！',
      defeatLine: '見事な一太刀であった……我が完敗だ！ 貴殿の武運が王宮まで続くことを祈る！'
    },
    {
      id: 'MERCHANT', name: '商人', gender: 'male', role: 'ペア至上主義商人', icon: '⚖️', img: 'fugo-絵柄/merchant.png',
      desc: 'ペアや3カードを崩さず大切に扱う。親番からまとめ出しで手札を一気に圧縮する。',
      startLine: 'へっへっへ、商売繁盛！ 損得勘定なら誰にも負けませんよ。手札を束ねてがっぽり稼がせてもらいます！',
      defeatLine: 'あいたたた、大赤字だ！ まさかこれほど鋭い値踏み（読み）をなさるとは……参りました！'
    },
    {
      id: 'JESTER', name: '道化師', gender: 'male', role: '予測不能トリッキー', icon: '🤡', img: 'fugo-絵柄/jester.png',
      desc: '定石を無視した奇抜な手を連発。場の空気をかき乱して対戦相手を翻弄する。',
      startLine: 'ヒャッハ〜！ 堅苦しいルールなんてつまんないよ〜？ 予測不能のサーカスを見せてあげる！',
      defeatLine: 'キャハハ！ 転んじゃった〜！ でもすっごく楽しかったよ！ 次のショーでも遊ぼうね〜！'
    },
    {
      id: 'SCHOLAR', name: '学者', gender: 'male', role: '確定勝ち観察分析', icon: '📖', img: 'fugo-絵柄/scholar.png',
      desc: '残存カードを冷静にカウンティング。勝率100%の確定ルートを導き出して勝利する。',
      startLine: 'カードは確率と論理の産物に過ぎません。あなたの打牌パターン、すべて解析させていただきます。',
      defeatLine: '私の計算式にない変数を見事に突かれた……実に興味深く、美しい敗北です。'
    }
  ],

  ROYAL_BOSSES: {
    YOUNG_KING: { id: 'BEGINNER_AI', name: '新王 (Young King)', title: '若き王子・玉座の間第一の試練', icon: '🤴', img: 'fugo-絵柄/young_king.png', secretImg: 'fugo-絵柄/young_bl.png', desc: '国王の愛息にして若き王子。父王への謁見を求める挑戦者の器を測るべく、玉座の間にて堂々と立ちはだかる。' },
    KING: { id: 'KING', name: '王 (King)', title: '宮廷の絶対君主・父', icon: '🏰', img: 'fugo-絵柄/king.png', desc: '宮廷の絶対君主にして新王の父。163次元APEX完全直感と詰み探索を操り、王者の威厳を振るう。' },
    QUEEN: { id: 'SUPER_AI', name: '女王 (Queen)', title: '宮廷の真の実力者・母', icon: '👸', img: 'fugo-絵柄/queen.png', secretImg: 'fugo-絵柄/queen_bl.png', desc: '宮廷の真の主にして母。研ぎ澄まされた冷徹な大局観を駆使し、氷のような厳格さで君臨する最高峰の実力者。' },
    AWAKENED_KING: { id: 'AWAKENED_KING', name: '覚醒新王 (Awakened King)', title: '過酷な修練を経て覚醒せし若き王', icon: '👑', img: 'fugo-絵柄/awakened_king.png', secretImg: 'fugo-絵柄/young_bl.png', desc: '両親の敗北を一身に背負い、髭を蓄えて真の君主として再誕した姿。深奥なる探索と冷徹な意志を融合させた王族の最高到達点。' }
  },

  HEROIC_BOSSES: {
    NOBUNAGA: { id: 'NOBUNAGA', name: '織田信長', title: '第六天魔王', icon: '⚔️', img: 'fugo-絵柄/nobunaga.png', desc: '天下布武を掲げる戦国の覇王。苛烈な三段撃ち連打と、親番を奪還する即死の8切りキルコンボを誇る。' },
    SHOTOKU: { id: 'SHOTOKU', name: '聖徳太子', title: '十人の声を聴く賢者', icon: '🔮', img: 'fugo-絵柄/shotoku.png', desc: '古代日本の大賢人。場に出たカードと未出カードを完璧に把握し、革命を瞬時に収める「大調和」を発動する。' },
    SHI_HUANGDI: { id: 'SHI_HUANGDI', name: '秦の始皇帝', title: '初代皇帝・法家統制', icon: '🏛️', img: 'fugo-絵柄/shi_huangdi.png', desc: '中華全土を統一した絶対の専制君主。無駄な手出しを法で禁じ、鉄壁の手札規格化と支配札の温存で圧勝する。' },
    ALEXANDER: { id: 'ALEXANDER', name: 'アレクサンダー大王', title: '不敗の征服王', icon: '🛡️', img: 'fugo-絵柄/alexander.png', desc: '世界の果てまで駆け抜けた若き覇王。ファランクス陣形による面制圧と電撃速攻で対局を瞬殺する。' },
    GILGAMESH: { id: 'GILGAMESH', name: 'ギルガメッシュ', title: '原初の覇王・神話の頂点', icon: '👑', img: 'fugo-絵柄/gilgamesh.png', desc: '人類最古の叙事詩に名を刻む神話の覇王。太古の宝器を統べる絶対者として、圧倒的な威光で人の子を迎え撃つ。' }
  },

  STORIES: {
    STAGE_1_CLEAR: [
      { speaker: GUIDE_SPEAKER, text: '見事だ！ 宮廷予選の全関門を制覇し、並み居る貴族たちをすべて退けたな！' },
      { speaker: GUIDE_SPEAKER, text: '貴殿の類まれなる腕前を認め、国王陛下がおわす「玉座の間」への拝謁が許可された。' },
      { speaker: GUIDE_SPEAKER, text: '……だが、いかに予選を制したとはいえ、いきなり陛下御自らがお相手を務められるわけにはいかぬ。' },
      { speaker: GUIDE_SPEAKER, text: 'まずは王宮第一の門番、陛下の愛息たる若き王子「新王」殿下が貴殿の器を試される。礼を失することなく、心して挑まれよ！' }
    ],
    BOSS_YOUNG_KING: [
      { speaker: '新王 (Young King)', text: '宮廷予選を突破し、父上への謁見を望む勝負師とは君のことだね。よくぞここまで辿り着いた。' },
      { speaker: '新王 (Young King)', text: 'だが、国王陛下の御前に進むには、相応の品格と実力が求められる。まずはこの僕が、君が玉座に相応しい器か見極めさせてもらうよ！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '若き王子、新王……！ 謁見の関門として不足はない。僕の計算と閃きで、突破してみせる！',
          girl: '澄んだ気品を感じるわ……。でも、国王陛下への道、ここで引き返すわけにはいかないわ！',
          guy: '父王にお目通りする前の腕試しってわけだな。上等だ、若大将！ 手加減なしで揉んでやるぜ！',
          lady: 'あら、礼儀正しく凛々しい若君ですこと。わたくしの力量、存分にお見せいたしますわ。'
        }
      }
    ],
    BOSS_YOUNG_KING_DEFEATED: [
      { speaker: '新王 (Young King)', text: '完敗だ……僕の読みを遥かに凌駕するとは。君の力、確かに父上へ拝謁するに相応しい……！' },
      { speaker: GUIDE_SPEAKER, text: '王子殿下を退けたか！ 玉座の奥より重厚な足音が響く……宮廷の主、父たる「王」が自ら立ち上がられたぞ！' }
    ],
    BOSS_KING: [
      { speaker: '王 (King)', text: '愛息の未熟を補うは父の務め。若き王子を退け、余が前に立ったこと、まずは称えてやろう。' },
      { speaker: '王 (King)', text: 'だが、宮廷の絶対君主たる余の威光は容易く越えられぬぞ。玉座の重み、自ら平定してみせようぞ！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '父たる国王陛下……！ 王者の重圧だろうと、僕の頭脳で冷静に切り開いてみせる！',
          girl: '王よ、あなたの威光もカードの公平な流れには逆らえないわ。……静かに示してみせる。',
          guy: 'ついにお出ましだな、宮廷の主！ その高い玉座から引きずり下ろしてやるぜ！',
          lady: 'ふふ、堂々たる玉座の主ですこと。けれど盤上をひれ伏させるのは、このわたくしですわ。'
        }
      },
      { speaker: '王 (King)', text: 'フハハ！ 威勢の良き挑戦者よ、存分に掛かってまいるがよい！' }
    ],
    BOSS_KING_DEFEATED: [
      { speaker: '王 (King)', text: 'ぐぬう……見事である！ 余の威光を盤上で上回る者が現れようとは……妻よ、すまぬ……！' },
      { speaker: GUIDE_SPEAKER, text: '国王陛下までもが打ち破られた……！ だが、玉座の間に凛とした冷気が立ち込める……宮廷の真の主、母たる「女王」のお出ましだ！' }
    ],
    BOSS_QUEEN: [
      { speaker: '女王 (Queen)', text: '愛する息子を退け、夫の玉座すら脅かすとは……随分と不作法な挑戦者ですこと。' },
      { speaker: '女王 (Queen)', text: '宮廷の秩序は、このわたくしが司るもの。氷のように冷徹な洗礼をお受けなさい。' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '宮廷の真の主、女王……！ あなたの冷徹な読みの深さすら、僕の手札で凌駕してみせる！',
          girl: '冷たく美しい女王……あなたの支配も、この一筋の光で終わりを迎えるわ。',
          guy: '凄まじい気迫だ……だが、ここで退いちゃ勝負師の名が廃る。全力でぶつかるまでだ！',
          lady: 'ふふ、冷え冷えとしたお言葉ですこと。どちらの手札がより華麗か、白黒つけましょう。'
        }
      }
    ],
    BOSS_QUEEN_DEFEATED: [
      { speaker: '女王 (Queen)', text: 'わたくしの冷徹な支配すら崩すというの……？ 息子よ……我が王家の誇りを託します……。' },
      { speaker: GUIDE_SPEAKER, text: '王宮の主たちがすべて敗れるとは……！ しかし見よ、父母の敗北を背負った新王が、過酷な鍛錬の果てに帰還したぞ……！' }
    ],
    BOSS_AWAKENED_KING: [
      { speaker: GUIDE_SPEAKER, text: '幾重もの過酷な修練を乗り越え、髭を蓄えて真の君主として再誕した「覚醒新王」の御姿だ！！' },
      { speaker: '覚醒新王 (Awakened King)', text: '父も母も敗れた……あの日から、私は全てを擲ち、ただ卓上の深淵と向き合ってきた。' },
      { speaker: '覚醒新王 (Awakened King)', text: '若き日の迷いは捨て去った。一族の宿命を背負い、王家の真なる到達点として君を迎え撃とう！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: 'その眼差し、積み重ねてきた修練の凄みが伝わってくる……！ 望むところだ、全身全霊で挑む！',
          girl: '過酷な道を越えてきたのね……。でも、運命の風は私の背中を押しているわ！',
          guy: '髭を蓄えて、見違えるほどの面構えになったじゃねぇか。最高の決戦、始めようぜ！',
          lady: 'あら、見違えるほど凛々しくなられて。成熟した王として、わたくしが美しく介錯して差し上げますわ。'
        }
      }
    ],
    STAGE_2_CLEAR: [
      { speaker: '覚醒新王 (Awakened King)', text: '見事だ……私の全てを尽くしたが、君には届かなかった。君こそが、この王宮を束ねる覇者だ。' },
      { speaker: GUIDE_SPEAKER, text: '王宮四連戦、完全制覇！ 貴殿がこの宮廷の頂点に立ったのだ！' },
      { speaker: GUIDE_SPEAKER, text: '……だが待て！ 玉座の間の時空が激しく歪み、遥かな古代から時代を遡るように強烈な覇気が吹き荒れてきたぞ……！？' },
      { speaker: GUIDE_SPEAKER, text: '戦国から古代へ……歴史の彼方より、戦国の覇王「織田信長」をはじめとする伝説の英傑たちが顕現した！ 覚悟して挑まれよ！' }
    ],
    BOSS_NOBUNAGA: [
      { speaker: GUIDE_SPEAKER, text: '玉座の間が紅蓮の炎に包まれ、時空を裂いて戦乱の覇気が渦巻く……！ 第六天魔王「織田信長」の顕現だ！！' },
      { speaker: '織田信長', text: '天下を狙うか。ならば、余を倒してみせよ。' },
      { speaker: '織田信長', text: 'よくぞ参った。だが、天下を統べるとはどういうことか……この信長が盤上で刻み込んでやろう！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '第六天魔王、織田信長……！ あなたの三段撃ち速攻すら、僕の計算で封殺する！',
          girl: '苛烈な炎を纏う覇王……でも、私の心は決して焼き尽くせはしないわ。',
          guy: '戦国の覇王と手合わせできるとはな！ 男冥利に尽きるぜ、真っ向勝負だ！',
          lady: 'ふふ、荒々しい天下人ですこと。その激しい攻め手、わたくしの蠱惑の微笑みでいなして差し上げますわ。'
        }
      }
    ],
    BOSS_NOBUNAGA_DEFEATED: [
      { speaker: '織田信長', text: '是非に及ばず！ 見事な采配であった……我が天下布武の先を行く者がおるとはな！' },
      { speaker: GUIDE_SPEAKER, text: '魔王・信長を退けた！ だが時空はさらに古代日本へと遡る……十人の声を聴く賢者「聖徳太子」の顕現だ！' }
    ],
    BOSS_SHOTOKU: [
      { speaker: GUIDE_SPEAKER, text: '深淵なる静寂が広がり、盤上に澄み渡る大調和の光が満ちる……！ 古代の聖賢「聖徳太子」のお出ましだ！' },
      { speaker: '聖徳太子', text: '焦る必要はありません。世の理に従い、静かに進めましょう。' },
      { speaker: '聖徳太子', text: '場に出たカードの声、そして未だ眠るカードの声まで聴いてみせましょう。大調和の心でお相手いたします。' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '盤上の全情報を傾聴する賢者……だが、僕の思考速度はあなたの調和をも上回る！',
          girl: 'あなたの静寂の奥にある深い慈悲……感じるわ。でも、私もこの道は譲れないわ！',
          guy: 'すべて見通しているような落ち着きだな。だが、修羅場の勝負は理屈だけじゃねぇぜ！',
          lady: 'あら、カードの声をお聴きになるの？ ならば「降伏なさい」という囁きも聞こえていまして？'
        }
      }
    ],
    BOSS_SHOTOKU_DEFEATED: [
      { speaker: '聖徳太子', text: 'これもまた大いなる学び。あなたの澄んだ志、しかと受け止めました。' },
      { speaker: GUIDE_SPEAKER, text: '大調和をも制したか！ 時はさらに遡り、古代中華の天地を統一せし絶対の皇帝「秦の始皇帝」が立ちはだかる！' }
    ],
    BOSS_SHI_HUANGDI: [
      { speaker: GUIDE_SPEAKER, text: '天地を揺るがす重厚な軍靴の響き！ 万里の長城を築きし初代統一皇帝「秦の始皇帝」が降臨した！！' },
      { speaker: '秦の始皇帝', text: '天下はすでに一つ。ならば、この卓上も朕が統一しよう。' },
      { speaker: '秦の始皇帝', text: '朕に逆らう者を許すつもりはない。すべてのカードを、万里の長城の如き法の下に置く！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '初代皇帝……！ 僕の計算は、あなたの法の綻びすら見逃さない！',
          girl: '厳格な法で縛られた世界……。カードたちはもっと自由に羽ばたきたがっているわ！',
          guy: '堅苦しい法律なんぞ卓の上じゃ関係ねぇ！ あんたの城壁、俺がブチ破ってやるぜ！',
          lady: '法で心を縛ることはできませんわ、皇帝陛下。わたくしの華麗な手札で翻弄して差し上げます。'
        }
      }
    ],
    BOSS_SHI_HUANGDI_DEFEATED: [
      { speaker: '秦の始皇帝', text: '朕の法網を破るか……見事である。汝の名を中華全土に轟かせよう。' },
      { speaker: GUIDE_SPEAKER, text: '始皇帝の支配すら打破した！ 時は西欧古代へと跳び、ユーラシアを疾駆した不敗の征服王「アレクサンダー大王」が進軍してくる！' }
    ],
    BOSS_ALEXANDER: [
      { speaker: GUIDE_SPEAKER, text: '砂塵を巻き上げ大軍勢の咆哮が轟く！ 世界の果てまで駆け抜けた不敗の若き征服王「アレクサンダー大王」の進軍だ！！' },
      { speaker: 'アレクサンダー大王', text: '勝利とは、待って手に入れるものではない。自ら攻め取りに行くものだ！' },
      { speaker: 'アレクサンダー大王', text: '私は世界の果てまで進んだ。君との勝負程度で退くと思うか？ 我がファランクス突撃を受け止めよ！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '征服王アレクサンダー！ あなたの不敗の電撃戦、僕の頭脳で最短迎撃してみせる！',
          girl: '世界の果てを目指した純粋な覇気……眩しいわ。でも、私の旅路もここで止まりはしない！',
          guy: '全軍突撃の直球勝負か！ 気に入ったぜ大王様、どちらの気迫が勝つか勝負だ！',
          lady: 'うふふ、疾風怒濤の英雄様。あまり急いて突撃なさると、わたくしの罠に足を取られますわよ？'
        }
      }
    ],
    BOSS_ALEXANDER_DEFEATED: [
      { speaker: 'アレクサンダー大王', text: 'アハハハ！ 素晴らしい突撃だった！ 私を止めた君なら、きっと世界の果てをも掴めるだろう！' },
      { speaker: GUIDE_SPEAKER, text: 'ついに、時空は人類原初の夜明けへと辿り着いた……！ 最古の神話に座す原初の覇王「ギルガメッシュ」が待つ！' }
    ],
    BOSS_GILGAMESH: [
      { speaker: GUIDE_SPEAKER, text: '黄金の輝きが空間を埋め尽くし、絶対の神威が満ちる……！ 人類最古の叙事詩に君臨する原初の覇王「ギルガメッシュ」の御前である！！' },
      { speaker: 'ギルガメッシュ', text: '原初の覇王、ギルガメッシュである。人の子よ、汝の全存在を懸けて我が前に立つがよい。' },
      { speaker: 'ギルガメッシュ', text: '太古より伝わる万象の宝器は、ことごとく我が掌中にある。神話の黎明より続く絶対の覇道、その目に焼き付けるがよい！' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: '神話の頂点、ギルガメッシュ！ 理論と直感、僕の持てるすべてを懸けて、あなたを超えてみせる！',
          girl: '原初の覇王……圧倒的な光ね。でも、私の小さな導きの光も、決して負けてはいないわ！',
          guy: 'お前さんが最後の壁か！ 相手が神話の覇王だろうと関係ねぇ！ 俺の勝負師の魂、全部叩きつけてやるぜ！！',
          lady: 'あらあら、これ以上ない極上の獲物ですこと。太古の覇王すら屈服させてこそ、最高の麗人ですわ！'
        }
      }
    ],
    ENDING: [
      { speaker: 'ギルガメッシュ', text: '……フッ、ハハハハハ！ 天晴れぞ、人の子よ！ 我が太古の宝器すら凌駕し、この我を卓上に沈めるとはな！' },
      { speaker: 'ギルガメッシュ', text: '汝の知略、その胆力、しかと認めた。我が戴く覇者の冠を汝に託そう！' },
      { speaker: '織田信長', text: 'ハハハ！ 天下を超え、神話をも制したか！ 見事な器量よ！' },
      { speaker: '聖徳太子', text: '大いなる調和の極みを見せていただきました。深く礼を申し上げます。' },
      { speaker: '秦の始皇帝', text: '朕の法をも凌駕する真の王の誕生である。万歳、万歳、万々歳！' },
      { speaker: 'アレクサンダー大王', text: '友よ、世界の果てはお前の手の中にあったな！ 最高の戦いであった！' },
      { speaker: '覚醒新王 (Awakened King)', text: '君という高き壁を越えるため、私はこれからも鍛錬を続けよう。友として、心から祝福する。' },
      {
        speaker: 'PLAYER',
        playerLines: {
          boy: 'やり遂げた……！ 計算も直感も、僕が信じたカードはすべて正しかった。僕が、新たな時代の真の大富豪王だ！',
          girl: 'カードたちの優しい囁きが、世界の天辺まで届いたわ……。みんな、ありがとう。この光を胸に歩み続けるわ。',
          guy: 'ガハハ！ 勝ったぜ！ 神話の王様だろうと卓の上じゃ一人の勝負師だ。修羅場を潜り抜けた俺の勝ちだ！ 最高の旅だったぜ！',
          lady: 'ふふふ……全時代の英雄たちをも、わたくしの手のひらの上で踊っていただきましたわ。今日からわたくしが、この世界の真の女王ですこと！'
        }
      },
      { speaker: GUIDE_SPEAKER, text: '宮廷中の貴族、王族、そして時空を超えた歴史の英傑たちよ、称えよ！ 幾多の死闘を制し、ついに頂点へと君臨した新たなる王の誕生である！！' },
      { speaker: GUIDE_SPEAKER, text: '👑 おめでとうございます！ シナリオモード完全制覇・殿堂入り達成！！ 👑' }
    ]
  },

  SAVE_KEY: 'royalScenarioSave_v10',
  data: {
    avatarId: null,
    matchesPerStage: 1,
    enableCardExchange: true,
    currentMatchIndex: 1,
    currentPhase: 'STAGE_1_A',
    clearedPrelimGroups: { A: false, B: false, C: false },
    selectedPrelimGroup: 'A',
    prelimGroups: null,
    unlockedSecrets: { YOUNG_KING: false, QUEEN: false, AWAKENED_KING: false },
    stageMatchStats: {},
    stageRankHistory: [],
    pendingAdvStory: null,
    aiStats: {}
  },

  init() {
    this.load();
    if (!this.data.matchesPerStage) this.data.matchesPerStage = 1;
    if (this.data.enableCardExchange === undefined) this.data.enableCardExchange = true;
    if (!this.data.currentMatchIndex) this.data.currentMatchIndex = 1;
    if (!this.data.clearedPrelimGroups) this.data.clearedPrelimGroups = { A: false, B: false, C: false };
    if (!this.data.aiStats) this.data.aiStats = {};
    if (!this.data.selectedPrelimGroup) this.data.selectedPrelimGroup = 'A';
    if (!this.data.unlockedSecrets) this.data.unlockedSecrets = { YOUNG_KING: false, QUEEN: false, AWAKENED_KING: false };
    if (!this.data.stageMatchStats) this.data.stageMatchStats = {};
    if (!this.data.stageRankHistory) this.data.stageRankHistory = [];
    this.setupPrelimGroups();

    GameStorage.syncWithScenarioProgress(this.data);

    if (!this.isInitialized) {
      this.isInitialized = true;
      GameEventManager.on('gameEnd', (payload) => {
        if (this.isActive) {
          this.handleMatchEnd(payload.playerStatusMap, payload.actionStats);
        }
      });
    }
  },

  save() {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  },

  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (raw) this.data = JSON.parse(raw);
    } catch (e) {}
  },

  reset() {
    localStorage.removeItem(this.SAVE_KEY);
    this.currentSeatRoster = null;
    if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
    previousRanks = {};

    this.data = {
      avatarId: null,
      matchesPerStage: 1,
      enableCardExchange: true,
      currentMatchIndex: 1,
      currentPhase: 'STAGE_1_A',
      clearedPrelimGroups: { A: false, B: false, C: false },
      selectedPrelimGroup: 'A',
      prelimGroups: null,
      unlockedSecrets: { YOUNG_KING: false, QUEEN: false, AWAKENED_KING: false },
      stageMatchStats: {},
      stageRankHistory: [],
      pendingAdvStory: null,
      aiStats: {}
    };
    this.setupPrelimGroups();
    this.save();

    const restartBtn = document.getElementById('btn-restart-scenario');
    if (restartBtn) restartBtn.classList.add('is-hidden');

    this.openAvatarSelectScreen();
  },

  setupPrelimGroups() {
    if (this.data.prelimGroups && this.data.prelimGroups.A && this.data.prelimGroups.B && this.data.prelimGroups.C) return;
    const shuffled = [...this.PRELIM_NOBLES].sort(() => Math.random() - 0.5);
    this.data.prelimGroups = {
      A: shuffled.slice(0, 3).map(n => n.id),
      B: shuffled.slice(3, 6).map(n => n.id),
      C: shuffled.slice(6, 9).map(n => n.id)
    };
    this.save();
  },

  getCurrentAvatar() {
    return this.AVATARS[this.data.avatarId || 'boy'];
  },

  getNemesisAI() {
    const stats = this.data.aiStats || {};
    const list = Object.values(stats);
    if (list.length === 0) {
      return this.PRELIM_NOBLES[Math.floor(Math.random() * this.PRELIM_NOBLES.length)];
    }
    list.sort((a, b) => {
      if (b.beatPlayer !== a.beatPlayer) return b.beatPlayer - a.beatPlayer;
      return b.games - a.games;
    });
    return list[0];
  },

  openAvatarSelectScreen() {
    soundMgr.playSelect();
    terminateCurrentSession();

    this.currentSeatRoster = null;
    this.data.stageMatchStats = {};
    this.data.stageRankHistory = [];
    this.data.currentMatchIndex = 1;
    if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
    previousRanks = {};

    document.getElementById('char-select-overlay').classList.remove('active');
    const screenMap = document.getElementById('screen-map');
    if (screenMap) { screenMap.classList.add('is-hidden'); screenMap.classList.remove('active'); }
    const screenAvatar = document.getElementById('screen-avatar-select');
    if (screenAvatar) { screenAvatar.classList.remove('is-hidden'); screenAvatar.classList.add('active'); }
    
    bgmMgr.setCharSelectPhase(true);

    isAutoPlayMode = false;
    const autoBtn = document.getElementById('auto-play-btn');
    if (autoBtn) autoBtn.classList.add('is-hidden');
    const speedControls = document.getElementById('speed-controls');
    if (speedControls) speedControls.classList.add('is-hidden');
    currentSpeed = 1;
    document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));

    if (this.data.avatarId) {
      document.querySelectorAll('.avatar-card-large').forEach(card => {
        const avId = card.getAttribute('data-avatar-id');
        card.classList.toggle('is-selected', avId === this.data.avatarId);
      });
      const dBtn = document.getElementById('btn-avatar-decide');
      if (dBtn) dBtn.disabled = false;
    }

    const curMatches = this.data.matchesPerStage || 1;
    document.querySelectorAll('.btn-scenario-game-count').forEach(btn => {
      const gNum = parseInt(btn.getAttribute('data-games'), 10) || 1;
      btn.classList.toggle('active', gNum === curMatches);
    });
    const hintEl = document.getElementById('scenario-games-hint');
    if (hintEl) hintEl.textContent = `（現在: ${curMatches}試合勝負）`;

    const isEx = this.data.enableCardExchange !== undefined ? !!this.data.enableCardExchange : true;
    const yExBtn = document.getElementById('btn-scenario-exchange-yes');
    const nExBtn = document.getElementById('btn-scenario-exchange-no');
    const exHintEl = document.getElementById('scenario-exchange-hint');
    if (yExBtn && nExBtn) {
      yExBtn.classList.toggle('active', isEx);
      nExBtn.classList.toggle('active', !isEx);
    }
    if (exHintEl) {
      exHintEl.textContent = isEx ? '（現在: 交換あり・座席継続）' : '（現在: 交換なし・毎回席替え）';
    }
  },

  openMapScreen() {
    terminateCurrentSession();

    this.currentSeatRoster = null;
    this.data.stageMatchStats = {};
    this.data.stageRankHistory = [];
    this.data.currentMatchIndex = 1;
    if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
    previousRanks = {};

    document.getElementById('char-select-overlay').classList.remove('active');
    const screenAvatar = document.getElementById('screen-avatar-select');
    if (screenAvatar) { screenAvatar.classList.add('is-hidden'); screenAvatar.classList.remove('active'); }
    const screenMap = document.getElementById('screen-map');
    if (screenMap) { screenMap.classList.remove('is-hidden'); screenMap.classList.add('active'); }

    const pBadge = document.getElementById('practice-progress-badge');
    if (pBadge) pBadge.classList.add('is-hidden');

    isAutoPlayMode = false;
    const autoBtn = document.getElementById('auto-play-btn');
    if (autoBtn) autoBtn.classList.add('is-hidden');
    const speedControls = document.getElementById('speed-controls');
    if (speedControls) speedControls.classList.add('is-hidden');
    currentSpeed = 1;
    document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));

    bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    bgmMgr.setCharSelectPhase(true);

    this.renderMapTree();

    if (this.data.pendingAdvStory) {
      const storyKey = this.data.pendingAdvStory;
      this.data.pendingAdvStory = null;
      this.save();

      const storyConfigMap = {
        STAGE_1_CLEAR: { lines: this.STORIES.STAGE_1_CLEAR, img: this.ROYAL_BOSSES.YOUNG_KING.img },
        BOSS_YOUNG_KING_DEFEATED: { lines: this.STORIES.BOSS_YOUNG_KING_DEFEATED, img: this.ROYAL_BOSSES.YOUNG_KING.img },
        BOSS_KING_DEFEATED: { lines: this.STORIES.BOSS_KING_DEFEATED, img: this.ROYAL_BOSSES.KING.img },
        BOSS_QUEEN_DEFEATED: { lines: this.STORIES.BOSS_QUEEN_DEFEATED, img: this.ROYAL_BOSSES.QUEEN.img },
        STAGE_2_CLEAR: { lines: this.STORIES.STAGE_2_CLEAR, img: this.ROYAL_BOSSES.AWAKENED_KING.img },
        BOSS_NOBUNAGA_DEFEATED: { lines: this.STORIES.BOSS_NOBUNAGA_DEFEATED, img: this.HEROIC_BOSSES.NOBUNAGA.img },
        BOSS_SHOTOKU_DEFEATED: { lines: this.STORIES.BOSS_SHOTOKU_DEFEATED, img: this.HEROIC_BOSSES.SHOTOKU.img },
        BOSS_SHI_HUANGDI_DEFEATED: { lines: this.STORIES.BOSS_SHI_HUANGDI_DEFEATED, img: this.HEROIC_BOSSES.SHI_HUANGDI.img },
        BOSS_ALEXANDER_DEFEATED: { lines: this.STORIES.BOSS_ALEXANDER_DEFEATED, img: this.HEROIC_BOSSES.ALEXANDER.img },
        ENDING: { lines: this.STORIES.ENDING, img: this.HEROIC_BOSSES.GILGAMESH.img }
      };

      const cfg = storyConfigMap[storyKey];
      if (cfg) {
        this.playDialogue(cfg.lines, cfg.img, () => {
          if (storyKey === 'ENDING') {
            this.showGrandEndingClearModal();
          } else {
            bgmMgr.setCharSelectPhase(true);
            this.renderMapTree();
          }
        });
      }
    }
  },

  showGrandEndingClearModal() {
    const clearModal = document.getElementById('modal-stage-clear');
    const iconEl = document.getElementById('clear-result-icon');
    const titleEl = document.getElementById('clear-result-title');
    const msgEl = document.getElementById('clear-result-msg');
    const returnBtn = document.getElementById('btn-return-to-map');
    const retryBtn = document.getElementById('btn-retry-stage');
    const restartBtn = document.getElementById('btn-restart-scenario');
    const wImg = document.getElementById('stage-clear-winner-img');
    const wName = document.getElementById('stage-clear-winner-name');
    const wPlateTitle = document.querySelector('#stage-clear-winner-plate .modal-winner-title');
    const winnerPlate = document.getElementById('stage-clear-winner-plate');
    const grandSaveBox = document.getElementById('scenario-grand-save-box');

    const pAvatar = this.getCurrentAvatar();

    document.querySelectorAll('.champion-particle').forEach(p => p.remove());
    this.spawnGoldParticles(clearModal, 3);
    soundMgr.playFanfare(3);

    if (winnerPlate) {
      winnerPlate.classList.remove('is-tier1-champion', 'is-tier2-champion');
      winnerPlate.classList.add('is-champion-plate', 'is-tier3-champion');
    }

    if (wImg) wImg.src = pAvatar.image;
    if (wName) wName.textContent = getPlayerDisplayName('player');
    if (wPlateTitle) wPlateTitle.innerHTML = '👑 MYTHIC SUPREME CHAMPION 👑';
    if (iconEl) iconEl.textContent = '🏆';
    if (titleEl) titleEl.textContent = '👑 GRAND FINALE! 全シナリオ完全制覇';
    if (msgEl) {
      msgEl.innerHTML = `
        <div class="honor-medal-badge gold-dual">🏆 ALL STAGES CLEARED 🏆 全宮廷・歴史英傑 完全制覇</div>
        <div style="margin-top:6px; line-height:1.5;">全宮廷の貴族、王族、そして時空を超えた歴史の英雄たちをすべて討ち果たし、真の【大富豪王】に輝かれました！ 心より称賛と祝福を贈ります。</div>
        <div style="margin-top:8px; font-size:11.5px; color:#ffd700; font-weight:bold;">🏆 あなたが歩んだ栄光の軌跡（全対戦打牌ログ）を学習データとして記録しますか？</div>
      `;
    }

    if (grandSaveBox) {
      grandSaveBox.classList.remove('is-hidden');
      this.bindScenarioLogSaveActions();
    }

    if (retryBtn) retryBtn.classList.add('is-hidden');
    if (restartBtn) restartBtn.classList.add('is-hidden');

    if (returnBtn) {
      returnBtn.querySelector('.btn-text').textContent = '🏆 別の勝負師で最初から挑む（周回）';
      returnBtn.onclick = () => {
        if (clearModal) clearModal.classList.remove('active');
        this.reset();
      };
    }

    if (clearModal) clearModal.classList.add('active');
  },

  bindScenarioLogSaveActions() {
    const jsonlBtn = document.getElementById('btn-scenario-download-jsonl');
    if (jsonlBtn) {
      jsonlBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.downloadLogs();
      };
    }
  },

  // ★PC logs/ 直接格納 ＆ 手元完全フォールバック ＆ 画面上直貼りワンタップコピー完全連携
  async downloadLogs() {
    let steps = AIDataLogger.stepLogs.filter(st => st.pattern === 'SCENARIO_BATTLE');
    // フィルターの空振りを完全防止（最新の対局ステップが存在すれば全件を確実に取得）
    if (!steps || steps.length === 0) {
      steps = AIDataLogger.stepLogs;
    }
    if (!steps || steps.length === 0) {
      alert('保存可能な対戦ログが記録されていません。');
      return;
    }

    const jsonl = steps.map(s => JSON.stringify(s)).join('\n');
    const fileName = `scenario_battle_all_steps_${this.getCurrentAvatar().id}_${getFormattedTimestamp()}.jsonl`;

    const statusEl = document.getElementById('scenario-save-status-msg');
    const showMsg = (text, isSuccess = true) => {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.style.color = isSuccess ? '#6ee7b7' : '#fca5a5';
      statusEl.style.borderColor = isSuccess ? '#059669' : '#dc2626';
      statusEl.classList.remove('is-hidden');
      setTimeout(() => { if (statusEl) statusEl.classList.add('is-hidden'); }, 7000);
    };

    // AIDataLoggerの統合保存関数を呼び出し（サーバー保存＋ファイルDL試行＋最前面直コピー完全展開）
    await AIDataLogger.saveLogFile(jsonl, fileName, (msg, isSuccess) => {
      showMsg(msg, isSuccess);
    });
  },

  renderMapTree() {
    const data = this.data;
    const p = data.currentPhase;
    const avatar = this.getCurrentAvatar();
    const matches = data.matchesPerStage || 1;

    const uPort = document.getElementById('map-user-portrait');
    const uName = document.getElementById('map-user-name');
    if (uPort) uPort.src = avatar.image;
    if (uName) uName.textContent = avatar.name;

    const condText = `${matches}試合勝負 (1勝以上＋首位突破)`;
    const c1 = document.getElementById('map-stage-1-condition');
    const c2 = document.getElementById('map-stage-2-condition');
    const c3 = document.getElementById('map-stage-3-condition');
    if (c1) c1.textContent = condText;
    if (c2) c2.textContent = condText;
    if (c3) c3.textContent = condText;

    const gContainer = document.getElementById('map-stage-1-groups');
    const isStage1Phase = p.startsWith('STAGE_1');
    if (gContainer && data.prelimGroups) {
      gContainer.innerHTML = '';
      ['A', 'B', 'C'].forEach(gKey => {
        const nobleIds = data.prelimGroups[gKey];
        const members = nobleIds.map(id => this.PRELIM_NOBLES.find(n => n.id === id));
        const isCleared = !!data.clearedPrelimGroups[gKey];
        const isSelected = isStage1Phase && (data.selectedPrelimGroup === gKey);

        const card = document.createElement('div');
        card.className = `stage-group-card${isCleared ? ' cleared' : ''}${isSelected ? ' active' : ''}`;
        card.title = isCleared ? '制覇済みグループ' : `グループ ${gKey} を選択して挑戦`;

        card.innerHTML = `
          <div class="group-card-title"><span>グループ ${gKey}</span></div>
          <div class="group-members-row">
            ${members.map(m => `<img class="group-member-thumb" src="${m.img}" onerror="this.onerror=null; this.src='${m.id.toLowerCase()}.png';" title="${m.name}" alt="">`).join('')}
          </div>
          <span class="group-status-badge ${isCleared ? 'status-cleared' : (isSelected ? 'status-ready' : '')}">
            ${isCleared ? '✅ 制覇済' : (isSelected ? '⚔️ 挑戦中' : '選択可')}
          </span>
        `;

        if (!isCleared && isStage1Phase) {
          card.style.cursor = 'pointer';
          card.onclick = () => {
            soundMgr.playSelect();
            data.selectedPrelimGroup = gKey;
            data.stageMatchStats = {};
            data.stageRankHistory = [];
            data.currentMatchIndex = 1;
            this.currentSeatRoster = null;
            if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
            previousRanks = {};
            this.save();
            this.renderMapTree();
          };
        }
        gContainer.appendChild(card);
      });
    }

    const stage2El = document.getElementById('map-stage-2');
    const isStage2Reached = p.startsWith('STAGE_2_') || p.startsWith('STAGE_3_') || p === 'COMPLETED';
    if (stage2El) {
      stage2El.classList.toggle('locked', !isStage2Reached);
      stage2El.classList.toggle('active', isStage2Reached);
    }

    // ① 新王 (YOUNG_KING)
    const ykCard = document.getElementById('boss-card-young-king');
    const ykImg = document.getElementById('boss-img-young-king');
    const ykTag = document.getElementById('boss-tag-young-king');
    const ykName = document.getElementById('boss-name-young-king');
    const ykRole = document.getElementById('boss-role-young-king');
    const isYoungKingCleared = (p === 'STAGE_2_KING' || p === 'STAGE_2_QUEEN' || p === 'STAGE_2_AWAKENED_KING' || p.startsWith('STAGE_3_') || p === 'COMPLETED');
    const isYoungKingActive = (p === 'STAGE_2_YOUNG_KING');
    if (ykCard) {
      ykCard.classList.remove('active', 'cleared', 'locked');
      if (ykImg) ykImg.src = this.ROYAL_BOSSES.YOUNG_KING.img;
      if (ykName) ykName.textContent = this.ROYAL_BOSSES.YOUNG_KING.name;
      if (ykRole) ykRole.textContent = this.ROYAL_BOSSES.YOUNG_KING.title;
      if (isYoungKingCleared) {
        if (ykTag) ykTag.textContent = '✅ 制覇済';
        ykCard.classList.add('cleared');
      } else if (isYoungKingActive) {
        if (ykTag) ykTag.textContent = '⚔️ 挑戦中';
        ykCard.classList.add('active');
      } else {
        if (ykTag) ykTag.textContent = '未到達';
        if (!isStage2Reached) ykCard.classList.add('locked');
      }
    }

    // ② 王 (KING)
    const kingCard = document.getElementById('boss-card-king');
    const kingTag = document.getElementById('boss-tag-king');
    const isKingCleared = (p === 'STAGE_2_QUEEN' || p === 'STAGE_2_AWAKENED_KING' || p.startsWith('STAGE_3_') || p === 'COMPLETED');
    const isKingActive = (p === 'STAGE_2_KING');
    if (kingCard && kingTag) {
      kingCard.classList.remove('active', 'cleared', 'locked');
      if (isKingCleared) {
        kingTag.textContent = '✅ 制覇済';
        kingCard.classList.add('cleared');
      } else if (isKingActive) {
        kingTag.textContent = '⚔️ 挑戦中';
        kingCard.classList.add('active');
      } else {
        kingTag.textContent = '未到達';
        if (!isYoungKingCleared) kingCard.classList.add('locked');
      }
    }

    // ③ 女王 (QUEEN)
    const qCard = document.getElementById('boss-card-queen');
    const qImg = document.getElementById('boss-img-queen');
    const qTag = document.getElementById('boss-tag-queen');
    const qName = document.getElementById('boss-name-queen');
    const qRole = document.getElementById('boss-role-queen');
    const isQueenCleared = (p === 'STAGE_2_AWAKENED_KING' || p.startsWith('STAGE_3_') || p === 'COMPLETED');
    const isQueenActive = (p === 'STAGE_2_QUEEN');
    if (qCard) {
      qCard.classList.remove('active', 'cleared', 'locked');
      if (data.unlockedSecrets.QUEEN || isKingCleared) {
        if (qImg) qImg.src = this.ROYAL_BOSSES.QUEEN.img;
        if (qName) qName.textContent = this.ROYAL_BOSSES.QUEEN.name;
        if (qRole) qRole.textContent = this.ROYAL_BOSSES.QUEEN.title;
        if (isQueenCleared) {
          if (qTag) qTag.textContent = '✅ 制覇済';
          qCard.classList.add('cleared');
        } else if (isQueenActive) {
          if (qTag) qTag.textContent = '⚔️ 挑戦中';
          qCard.classList.add('active');
        } else {
          if (qTag) qTag.textContent = '解禁';
        }
      } else {
        qCard.classList.add('locked');
        if (qImg) qImg.src = this.ROYAL_BOSSES.QUEEN.secretImg;
        if (qTag) qTag.textContent = 'シークレット';
        if (qName) qName.textContent = '？？？';
        if (qRole) qRole.textContent = '？？？';
      }
    }

    // ④ 覚醒新王 (AWAKENED_KING)
    const akCard = document.getElementById('boss-card-awakened-king');
    const akImg = document.getElementById('boss-img-awakened-king');
    const akTag = document.getElementById('boss-tag-awakened-king');
    const akName = document.getElementById('boss-name-awakened-king');
    const akRole = document.getElementById('boss-role-awakened-king');
    const isAwakenedCleared = (p.startsWith('STAGE_3_') || p === 'COMPLETED');
    const isAwakenedActive = (p === 'STAGE_2_AWAKENED_KING');
    if (akCard) {
      akCard.classList.remove('active', 'cleared', 'locked');
      if (data.unlockedSecrets.AWAKENED_KING || isQueenCleared) {
        if (akImg) akImg.src = this.ROYAL_BOSSES.AWAKENED_KING.img;
        if (akName) akName.textContent = this.ROYAL_BOSSES.AWAKENED_KING.name;
        if (akRole) akRole.textContent = this.ROYAL_BOSSES.AWAKENED_KING.title;
        if (isAwakenedCleared) {
          if (akTag) qTag.textContent = '✅ 制覇済';
          akCard.classList.add('cleared');
        } else if (isAwakenedActive) {
          if (akTag) akTag.textContent = '⚔️ 挑戦中';
          akCard.classList.add('active');
        } else {
          if (akTag) akTag.textContent = '解禁';
        }
      } else {
        akCard.classList.add('locked');
        if (akImg) akImg.src = this.ROYAL_BOSSES.AWAKENED_KING.secretImg;
        if (akTag) akTag.textContent = 'シークレット';
        if (akName) akName.textContent = '？？？';
        if (akRole) akRole.textContent = '？？？';
      }
    }

    const stage3El = document.getElementById('map-stage-3');
    const isStage3Unlocked = p.startsWith('STAGE_3_') || p === 'COMPLETED';
    if (stage3El) {
      stage3El.classList.toggle('is-hidden', !isStage3Unlocked);
      stage3El.classList.toggle('locked', !isStage3Unlocked);
      stage3El.classList.toggle('active', isStage3Unlocked);
      if (isStage3Unlocked) this.renderStage3BossesDynamic();
    }

    this.updateLaunchBar();

    setTimeout(() => {
      let targetActiveBlock = null;
      if (p.startsWith('STAGE_3_')) {
        targetActiveBlock = stage3El;
      } else if (p.startsWith('STAGE_2_')) {
        targetActiveBlock = stage2El;
      } else {
        targetActiveBlock = document.getElementById('map-stage-1');
      }
      if (targetActiveBlock && typeof targetActiveBlock.scrollIntoView === 'function') {
        targetActiveBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  },

  renderStage3BossesDynamic() {
    const container = document.getElementById('map-stage-3-boss-row');
    if (!container) return;
    container.innerHTML = '';

    const p = this.data.currentPhase;
    const heroSequence = [
      { key: 'NOBUNAGA', obj: this.HEROIC_BOSSES.NOBUNAGA },
      { key: 'SHOTOKU', obj: this.HEROIC_BOSSES.SHOTOKU },
      { key: 'SHI_HUANGDI', obj: this.HEROIC_BOSSES.SHI_HUANGDI },
      { key: 'ALEXANDER', obj: this.HEROIC_BOSSES.ALEXANDER },
      { key: 'GILGAMESH', obj: this.HEROIC_BOSSES.GILGAMESH }
    ];
    const phaseOrder = ['STAGE_3_NOBUNAGA', 'STAGE_3_SHOTOKU', 'STAGE_3_SHI_HUANGDI', 'STAGE_3_ALEXANDER', 'STAGE_3_GILGAMESH', 'COMPLETED'];
    const curIdx = phaseOrder.indexOf(p);

    let latestCardEl = null;
    for (let i = 0; i <= Math.min(curIdx, 4); i++) {
      const item = heroSequence[i];
      const isCleared = (i < curIdx);
      const isCurrent = (i === curIdx);
      const isLast = (item.key === 'GILGAMESH');

      const card = document.createElement('div');
      card.className = `map-boss-card${isCleared ? ' cleared' : ''}${isCurrent ? ' active' : ''}${isLast ? ' boss-card-last' : ''}`;
      card.innerHTML = `
        <div class="boss-card-img-wrap">
          <img src="${item.obj.img}" onerror="this.onerror=null; this.src='${item.key.toLowerCase()}.png';" alt="${item.obj.name}">
          <span class="boss-status-tag">${isCleared ? '✅ 制覇済' : '⚔️ 挑戦中'}</span>
        </div>
        <div class="boss-card-name">${item.obj.icon} ${item.obj.name}</div>
        <div class="boss-card-role">${item.obj.title}</div>
      `;
      container.appendChild(card);
      if (isCurrent || isLast) latestCardEl = card;
    }

    if (latestCardEl && curIdx >= 2) {
      setTimeout(() => {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }, 180);
    }
  },

  updateLaunchBar() {
    const data = this.data;
    const p = data.currentPhase;
    const matches = data.matchesPerStage || 1;
    const stageLabel = document.getElementById('launch-stage-label');
    const ruleLabel = document.getElementById('launch-rule-label');
    const userStatus = document.getElementById('map-user-status');
    const launchBtn = document.getElementById('btn-launch-battle');

    const condDesc = `（全${matches}試合 / 1勝以上＋首位で突破）`;

    if (p.startsWith('STAGE_1')) {
      const gKey = data.selectedPrelimGroup || 'A';
      const clearedCount = Object.values(data.clearedPrelimGroups).filter(Boolean).length;
      if (stageLabel) stageLabel.textContent = `次の試練：予選${gKey}グループとの戦い ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `規定試合を消化し、最低1勝＋首位（大富豪率または平均順位1位）で突破せよ！`;
      if (userStatus) userStatus.textContent = `第1章：宮廷予選（進捗 ${clearedCount} / 3 制圧）`;
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_2_YOUNG_KING') {
      if (stageLabel) stageLabel.textContent = `決戦：玉座の間・第1の試練「新王 (Young King)」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `若き王子を相手に最低1勝＋首位を掴み、国王陛下への拝謁を果たせ！`;
      if (userStatus) userStatus.textContent = '第2章：王宮四連戦（第1関門: 新王）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_2_KING') {
      if (stageLabel) stageLabel.textContent = `決戦：玉座の絶対君主「王 (King)」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `父たる絶対君主を打ち破り、王者の威光を越えてみせよ！`;
      if (userStatus) userStatus.textContent = '第2章：王宮四連戦（第2関門: 王）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_2_QUEEN') {
      if (stageLabel) stageLabel.textContent = `決戦：宮廷の真の主「女王 (Queen)」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `最高峰の冷徹な知性を制圧し、首位を奪い取れ！`;
      if (userStatus) userStatus.textContent = '第2章：王宮四連戦（第3関門: 女王）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_2_AWAKENED_KING') {
      if (stageLabel) stageLabel.textContent = `王宮頂上決戦：修練を経て覚醒せし「覚醒新王 (Awakened King)」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `髭を蓄え真の君主となった若き覇王を破り、王宮を完全制覇せよ！`;
      if (userStatus) userStatus.textContent = '第2章：王宮四連戦（最終頂上関門: 覚醒新王）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_3_NOBUNAGA') {
      if (stageLabel) stageLabel.textContent = `英傑決戦：第六天魔王「織田信長」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `三段撃ち速攻を凌ぎ、首位を掴み取れ！`;
      if (userStatus) userStatus.textContent = '第3章：歴史の英傑（信長）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_3_SHOTOKU') {
      if (stageLabel) stageLabel.textContent = `英傑決戦：古代日本の賢者「聖徳太子」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `カードの声を聴き分ける大賢人に勝利せよ！`;
      if (userStatus) userStatus.textContent = '第3章：歴史の英傑（聖徳太子）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_3_SHI_HUANGDI') {
      if (stageLabel) stageLabel.textContent = `英傑決戦：中華統一「秦の始皇帝」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `法家統制の鉄壁を打ち破れ！`;
      if (userStatus) userStatus.textContent = '第3章：歴史の英傑（始皇帝）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_3_ALEXANDER') {
      if (stageLabel) stageLabel.textContent = `英傑決戦：不敗の征服王「アレクサンダー大王」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `ファランクス電撃戦を迎え撃て！`;
      if (userStatus) userStatus.textContent = '第3章：歴史の英傑（アレク王）';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'STAGE_3_GILGAMESH' || p === 'COMPLETED') {
      if (stageLabel) stageLabel.textContent = `最終神話決戦：原初の覇王「ギルガメッシュ」 ${condDesc}`;
      if (ruleLabel) ruleLabel.textContent = `神話の覇王を討ち果たし、伝説となれ！`;
      if (userStatus) userStatus.textContent = '最終決戦：ギルガメッシュ';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>出陣する ⚔️</span>';
        launchBtn.onclick = () => this.launchScenarioBattle();
      }
    } else if (p === 'COMPLETED') {
      if (stageLabel) stageLabel.textContent = `👑 全シナリオ完全制覇！ 殿堂入り達成！`;
      if (ruleLabel) ruleLabel.textContent = `歴史にその名を刻みました。別の勝負師を選んで新たな覇権へ挑みましょう！`;
      if (userStatus) userStatus.textContent = '殿堂入り：宮廷真王';
      if (launchBtn) {
        launchBtn.innerHTML = '<span>🏆 別の勝負師で最初から挑む ⚔️</span>';
        launchBtn.onclick = () => {
          this.reset();
        };
      }
    }
  },

  playDialogue(dialogueList, bossImgSrc, onComplete) {
    const overlay = document.getElementById('adv-overlay');
    const speakerEl = document.getElementById('adv-speaker-name');
    const textEl = document.getElementById('adv-dialogue-text');
    const playerActor = document.getElementById('adv-player-actor');
    const bossActor = document.getElementById('adv-boss-actor');
    const guideActor = document.getElementById('adv-guide-actor');
    const playerImg = document.getElementById('adv-player-img');
    const bossImg = document.getElementById('adv-boss-img');
    const skipBtn = document.getElementById('adv-btn-skip');
    const advVerBadge = document.getElementById('adv-version-badge');

    if (!overlay || !dialogueList || dialogueList.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    if (advVerBadge && typeof APP_VERSION !== 'undefined') {
      advVerBadge.textContent = `👑 Ver. ${APP_VERSION.replace('v', '')}`;
    }

    const currentAvatar = this.getCurrentAvatar();
    if (playerImg) playerImg.src = currentAvatar.image;
    if (bossImg && bossImgSrc) {
      bossImg.src = bossImgSrc;
      bossImg.onerror = () => { bossImg.src = 'king.png'; };
    }

    overlay.classList.remove('is-hidden');
    let currentIndex = 0;
    let isCompleted = false;
    let currentHeroBgmTriggered = null;

    const finishDialogue = () => {
      if (isCompleted) return;
      isCompleted = true;
      overlay.classList.add('is-hidden');
      if (onComplete) onComplete();
    };

    const showStep = () => {
      if (currentIndex >= dialogueList.length) {
        finishDialogue();
        return;
      }
      const item = dialogueList[currentIndex];
      const isPlayerTalking = (item.speaker === 'PLAYER');
      const isGuideTalking = (item.speaker === GUIDE_SPEAKER);
      const speakerName = isPlayerTalking ? currentAvatar.name : item.speaker;

      const heroKey = HERO_SPEAKER_KEY_MAP[item.speaker];
      if (heroKey && currentHeroBgmTriggered !== heroKey) {
        currentHeroBgmTriggered = heroKey;
        bgmMgr.playHeroStoryBgm(heroKey);
      }

      speakerEl.textContent = speakerName;

      if (isPlayerTalking) {
        if (item.playerLines && item.playerLines[currentAvatar.id]) {
          textEl.textContent = item.playerLines[currentAvatar.id];
        } else {
          textEl.textContent = item.text;
        }
      } else {
        textEl.textContent = item.text;
      }

      speakerEl.classList.toggle('is-guide', isGuideTalking);
      speakerEl.classList.toggle('is-boss-speaking', !isPlayerTalking && !isGuideTalking);

      if (isGuideTalking) {
        if (bossActor) bossActor.classList.add('is-hidden');
        if (guideActor) {
          guideActor.classList.remove('is-hidden', 'is-idle');
          guideActor.classList.add('is-guide-speaking');
        }
        if (playerActor) {
          playerActor.classList.remove('is-speaking');
          playerActor.classList.add('is-idle');
        }
      } else if (isPlayerTalking) {
        if (guideActor) guideActor.classList.add('is-hidden');
        if (bossActor) {
          bossActor.classList.remove('is-hidden', 'is-speaking');
          bossActor.classList.add('is-idle');
        }
        if (playerActor) {
          playerActor.classList.remove('is-idle');
          playerActor.classList.add('is-speaking');
        }
      } else {
        if (guideActor) guideActor.classList.add('is-hidden');
        if (bossActor) {
          bossActor.classList.remove('is-hidden', 'is-idle');
          bossActor.classList.add('is-speaking');
        }
        if (playerActor) {
          playerActor.classList.remove('is-speaking');
          playerActor.classList.add('is-idle');
        }
      }

      soundMgr.playTone(300, null, 'sine', 0.03, 0.1);
    };

    overlay.onclick = (e) => {
      if (e.target && e.target.id === 'adv-btn-skip') return;
      currentIndex++;
      showStep();
    };

    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.stopPropagation();
        finishDialogue();
      };
    }

    showStep();
  },

  launchScenarioBattle() {
    soundMgr.playSelect();
    terminateCurrentSession();

    const p = this.data.currentPhase;
    this.data.currentMatchIndex = 1;
    this.data.stageMatchStats = {};
    this.data.stageRankHistory = [];
    this.currentSeatRoster = null;
    if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
    previousRanks = {};
    this.save();

    if (p.startsWith('STAGE_1')) {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      const gKey = this.data.selectedPrelimGroup || 'A';
      const nobleIds = this.data.prelimGroups[gKey];
      const leaderNoble = this.PRELIM_NOBLES.find(n => n.id === nobleIds[0]) || this.PRELIM_NOBLES[0];
      const clearedCount = Object.values(this.data.clearedPrelimGroups).filter(Boolean).length;

      const nobleStartLine = leaderNoble.startLine || `若き勝負師よ。この${leaderNoble.name}が貴殿の力量を試してやろう。全力で向かってくるが良い！`;

      let dialogueList = [];
      if (clearedCount === 0) {
        dialogueList = [
          { speaker: GUIDE_SPEAKER, text: `ようこそ、栄光を求める勝負師よ！ 宮廷予選トーナメント開幕だ。まずは【グループ ${gKey}】の貴族たちが立ちはだかるぞ！` },
          { speaker: leaderNoble.name, text: nobleStartLine },
          {
            speaker: 'PLAYER',
            playerLines: {
              boy: '誰が相手だろうと怯みはしない。僕の計算力で最初の関門を必ず突破してみせる！',
              girl: 'どんな相手でも恐れはしないわ。カードの導きと共に、必ず突破してみせる。',
              guy: 'へっ、相手が誰だろうと関係ねぇ。俺の流儀で真っ向から突破してやるぜ！',
              lady: 'ふふ、どなたが相手でも怯みはいたしませんわ。華麗に越えさせていただきます。'
            }
          }
        ];
      } else if (clearedCount === 1) {
        const lineText = leaderNoble.gender === 'female'
          ? `あら、1勝した程度で浮かれないでちょうだい。我が手の内を潜り抜けられるかしら？`
          : leaderNoble.startLine;
        dialogueList = [
          { speaker: GUIDE_SPEAKER, text: `見事1つのグループを制圧したな！ だが油断するな、次の【グループ ${gKey}】も一筋縄ではいかん曲者揃いだ！` },
          { speaker: leaderNoble.name, text: lineText },
          {
            speaker: 'PLAYER',
            playerLines: {
              boy: '連勝を掴み取り、本戦への足がかりを固める！ いざ勝負！',
              girl: '連勝を掴み取り、本戦への道を切り拓いてみせるわ！',
              guy: '連勝街道を突き進んでやるぜ！ まとめてかかってきな！',
              lady: '勢いに乗って、次の勝利も美しくいただいて差し上げますわ。'
            }
          }
        ];
      } else {
        const lineText = leaderNoble.gender === 'female'
          ? `予選の殿を務めるのはわたくしよ。玉座の間への切符が欲しくば、全身全霊で挑みなさい！`
          : `予選の殿を務めるはこの私だ。玉座の間へ進みたくば、全身全霊で我らを倒してみせよ！`;
        dialogueList = [
          { speaker: GUIDE_SPEAKER, text: `いよいよ予選トーナメント最終関門！ この【グループ ${gKey}】を突破すれば、国王陛下への拝謁許可が下り、玉座の間への扉が開くぞ！` },
          { speaker: leaderNoble.name, text: lineText },
          {
            speaker: 'PLAYER',
            playerLines: {
              boy: 'ここを越えれば玉座の間だ……！ 予選完全制覇、成し遂げてみせる！',
              girl: 'ここを越えれば玉座の間……！ 予選完全制覇、成し遂げてみせるわ！',
              guy: 'ここを越えりゃ玉座の間のお出ましだな！ まとめて叩きのめしてやるぜ！',
              lady: '玉座の間を開く鍵、わたくしが誇り高く手に入れて差し上げますわ。'
            }
          }
        ];
      }

      this.playDialogue(dialogueList, leaderNoble.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_2_YOUNG_KING') {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      this.playDialogue(this.STORIES.BOSS_YOUNG_KING, this.ROYAL_BOSSES.YOUNG_KING.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_2_KING') {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      this.playDialogue(this.STORIES.BOSS_KING, this.ROYAL_BOSSES.KING.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_2_QUEEN') {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      this.playDialogue(this.STORIES.BOSS_QUEEN, this.ROYAL_BOSSES.QUEEN.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_2_AWAKENED_KING') {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      this.playDialogue(this.STORIES.BOSS_AWAKENED_KING, this.ROYAL_BOSSES.AWAKENED_KING.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_3_NOBUNAGA') {
      this.playDialogue(this.STORIES.BOSS_NOBUNAGA, this.HEROIC_BOSSES.NOBUNAGA.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_3_SHOTOKU') {
      this.playDialogue(this.STORIES.BOSS_SHOTOKU, this.HEROIC_BOSSES.SHOTOKU.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_3_SHI_HUANGDI') {
      this.playDialogue(this.STORIES.BOSS_SHI_HUANGDI, this.HEROIC_BOSSES.SHI_HUANGDI.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_3_ALEXANDER') {
      this.playDialogue(this.STORIES.BOSS_ALEXANDER, this.HEROIC_BOSSES.ALEXANDER.img, () => this.startScenarioMatchEngine());
    } else if (p === 'STAGE_3_GILGAMESH' || p === 'COMPLETED') {
      this.playDialogue(this.STORIES.BOSS_GILGAMESH, this.HEROIC_BOSSES.GILGAMESH.img, () => this.startScenarioMatchEngine());
    } else {
      this.startScenarioMatchEngine();
    }
  },

  startScenarioMatchEngine() {
    this.isActive = true;
    if (typeof MatchSeriesManager !== 'undefined') MatchSeriesManager.isActive = false;

    isAutoPlayMode = false;
    const autoBtn = document.getElementById('auto-play-btn');
    if (autoBtn) autoBtn.classList.add('is-hidden');
    const speedControls = document.getElementById('speed-controls');
    if (speedControls) speedControls.classList.add('is-hidden');
    currentSpeed = 1;
    document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));

    enableCardExchange = this.data.enableCardExchange !== undefined ? !!this.data.enableCardExchange : true;

    if (!enableCardExchange || this.data.currentMatchIndex === 1) {
      previousRanks = {};
    }

    const p = this.data.currentPhase;
    let cpu1Def = null, cpu2Def = null, cpu3Def = null;
    let titleStr = '';

    const shouldShuffle = (this.data.currentMatchIndex === 1) || (!enableCardExchange) || (!this.currentSeatRoster);

    if (p.startsWith('STAGE_1')) {
      const gKey = this.data.selectedPrelimGroup || 'A';
      const nobleIds = this.data.prelimGroups[gKey];
      if (shouldShuffle) {
        this.currentSeatRoster = shuffle([...nobleIds]);
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = `予選${gKey}グループとの対決`;
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    } else if (p === 'STAGE_2_YOUNG_KING') {
      if (shouldShuffle) {
        const candidates = shuffle([CHARACTER_DEFS.COUNT, CHARACTER_DEFS.KNIGHT]);
        this.currentSeatRoster = [candidates[0].id, 'BEGINNER_AI', candidates[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '玉座の試練：新王 (Young King) の迎撃';
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    } else if (p === 'STAGE_2_KING') {
      if (shouldShuffle) {
        const candidates = shuffle([CHARACTER_DEFS.DUKE, CHARACTER_DEFS.MARQUIS]);
        this.currentSeatRoster = [candidates[0].id, 'KING', candidates[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '玉座の決戦：王 (King) との直接対決';
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    } else if (p === 'STAGE_2_QUEEN') {
      if (shouldShuffle) {
        const candidates = shuffle([CHARACTER_DEFS.MERCHANT, CHARACTER_DEFS.STRATEGIST]);
        this.currentSeatRoster = [candidates[0].id, 'SUPER_AI', candidates[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '宮廷の真の主：女王 (Queen) の洗礼';
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    } else if (p === 'STAGE_2_AWAKENED_KING') {
      if (shouldShuffle) {
        const candidates = shuffle([CHARACTER_DEFS.REVOLUTIONARY, CHARACTER_DEFS.JESTER]);
        this.currentSeatRoster = [candidates[0].id, 'AWAKENED_KING', candidates[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '王宮頂上決戦：覚醒新王 (Awakened King)';
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    } else if (p === 'STAGE_3_NOBUNAGA') {
      if (shouldShuffle) {
        const nemesis = this.getNemesisAI();
        const opp1 = CHARACTER_DEFS[nemesis.id] || CHARACTER_DEFS.DUKE;
        const shuffled = shuffle([opp1, CHARACTER_DEFS.SCHOLAR]);
        this.currentSeatRoster = [shuffled[0].id, 'NOBUNAGA', shuffled[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '英傑決戦：第六天魔王「織田信長」';
      bgmMgr.setHeroBaseBgm('NOBUNAGA');
    } else if (p === 'STAGE_3_SHOTOKU') {
      if (shouldShuffle) {
        const shuffled = shuffle([CHARACTER_DEFS.NOBUNAGA, CHARACTER_DEFS.KING]);
        this.currentSeatRoster = [shuffled[0].id, 'SHOTOKU', shuffled[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '英傑決戦：古代の賢者「聖徳太子」';
      bgmMgr.setHeroBaseBgm('SHOTOKU');
    } else if (p === 'STAGE_3_SHI_HUANGDI') {
      if (shouldShuffle) {
        const shuffled = shuffle([CHARACTER_DEFS.SHOTOKU, CHARACTER_DEFS.SUPER_AI]);
        this.currentSeatRoster = [shuffled[0].id, 'SHI_HUANGDI', shuffled[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '英傑決戦：初代皇帝「秦の始皇帝」';
      bgmMgr.setHeroBaseBgm('SHI_HUANGDI');
    } else if (p === 'STAGE_3_ALEXANDER') {
      if (shouldShuffle) {
        const shuffled = shuffle([CHARACTER_DEFS.SHI_HUANGDI, CHARACTER_DEFS.BEGINNER_AI]);
        this.currentSeatRoster = [shuffled[0].id, 'ALEXANDER', shuffled[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '英傑決戦：不敗の覇王「アレク王」';
      bgmMgr.setHeroBaseBgm('ALEXANDER');
    } else if (p === 'STAGE_3_GILGAMESH' || p === 'COMPLETED') {
      if (shouldShuffle) {
        const shuffled = shuffle([CHARACTER_DEFS.ALEXANDER, CHARACTER_DEFS.NOBUNAGA]);
        this.currentSeatRoster = [shuffled[0].id, 'GILGAMESH', shuffled[1].id];
      }
      cpu1Def = CHARACTER_DEFS[this.currentSeatRoster[0]];
      cpu2Def = CHARACTER_DEFS[this.currentSeatRoster[1]];
      cpu3Def = CHARACTER_DEFS[this.currentSeatRoster[2]];
      titleStr = '原初の神話決戦：覇王「ギルガメッシュ」';
      bgmMgr.setHeroBaseBgm('GILGAMESH');
    }

    assignedCharacters.player = {
      id: this.data.avatarId || 'boy',
      name: this.getCurrentAvatar().shortName || this.getCurrentAvatar().name,
      icon: '👤'
    };
    assignedCharacters.cpu1 = cpu1Def;
    assignedCharacters.cpu2 = cpu2Def;
    assignedCharacters.cpu3 = cpu3Def;

    const pBadge = document.getElementById('practice-progress-badge');
    const pText = document.getElementById('practice-progress-text');
    const pIcon = document.getElementById('progress-mode-icon');
    if (pBadge && pText) {
      pBadge.classList.remove('is-hidden');
      pBadge.classList.remove('mode-badge-practice', 'mode-badge-auto');
      pBadge.classList.add('mode-badge-scenario');
      if (pIcon) pIcon.textContent = '📜';
      pText.textContent = `${titleStr}（第 ${this.data.currentMatchIndex} / ${this.data.matchesPerStage} 試合）`;
    }

    const sMap = document.getElementById('screen-map');
    const sAvatar = document.getElementById('screen-avatar-select');
    if (sMap) { sMap.classList.add('is-hidden'); sMap.classList.remove('active'); }
    if (sAvatar) { sAvatar.classList.add('is-hidden'); sAvatar.classList.remove('active'); }
    document.getElementById('char-select-overlay').classList.remove('active');

    updateCharacterUI();
    const pImg = document.getElementById('player-portrait');
    if (pImg) pImg.src = this.getCurrentAvatar().image;

    bgmMgr.setCharSelectPhase(false);
    startNewGame();
  },

  handleMatchEnd(statusMap, actionStats) {
    const rankValues = { '大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4 };
    const myRank = rankValues[statusMap.player] || 4;

    previousRanks = { ...statusMap };

    // グラフ描画用にプレイヤーおよび各CPUのキャラIDベースで順位を完全記録
    const thisGameRanks = {};

    PLAYERS.forEach(p => {
      const isMe = (p === 'player');
      const charId = isMe ? 'player' : assignedCharacters[p]?.id;
      if (!charId) return;

      const rNum = rankValues[statusMap[p]] || 4;
      thisGameRanks[p] = rNum;
      thisGameRanks[charId] = rNum;

      if (!this.data.stageMatchStats[charId]) {
        this.data.stageMatchStats[charId] = {
          charId: charId,
          name: isMe ? getPlayerDisplayName('player') : assignedCharacters[p]?.name,
          icon: isMe ? '👤' : (assignedCharacters[p]?.icon || '👤'),
          isPlayer: isMe,
          df: 0, f: 0, h: 0, dh: 0, rankSum: 0, games: 0,
          eightCuts: 0, revolutions: 0,
          usedAutoAssist: false
        };
      }
      const st = this.data.stageMatchStats[charId];
      st.games++;
      st.rankSum += rNum;
      if (rNum === 1) st.df++;
      else if (rNum === 2) st.f++;
      else if (rNum === 3) st.h++;
      else if (rNum === 4) st.dh++;

      if (actionStats && actionStats[p]) {
        st.eightCuts += (actionStats[p].eightCuts || 0);
        st.revolutions += (actionStats[p].revolutions || 0);
      }

      if (!isMe) {
        const cId = assignedCharacters[p].id;
        if (!this.data.aiStats[cId]) {
          this.data.aiStats[cId] = { id: cId, name: assignedCharacters[p].name, icon: assignedCharacters[p].icon, games: 0, beatPlayer: 0 };
        }
        this.data.aiStats[cId].games++;
        if (rNum < myRank) this.data.aiStats[cId].beatPlayer++;
      }
    });

    if (!this.data.stageRankHistory) this.data.stageRankHistory = [];
    this.data.stageRankHistory.push({
      gameIndex: this.data.currentMatchIndex || 1,
      ranks: thisGameRanks
    });

    this.save();

    // ★万一のブラウザ終了に備え、localStorageへ直前対局ステップを自動永久バックアップ
    try {
      localStorage.setItem('royalScenarioLastMatchStepsBackup', JSON.stringify(AIDataLogger.stepLogs));
    } catch (e) {}

    const curM = this.data.currentMatchIndex || 1;
    const totM = this.data.matchesPerStage || 1;
    const matchWinnerSeat = PLAYERS.find(s => statusMap[s] === '大富豪') || 'player';

    if (curM < totM) {
      renderFinalRanking();
      renderNextGameInterimDashboard();

      const promptEl = document.getElementById('next-game-prompt-text');
      const nextMatchBtnText = document.getElementById('next-match-btn-text');

      if (promptEl) {
        const exStr = this.data.enableCardExchange ? '（座席継続・カード交換あり）' : '（席替えシャッフル・直接配札）';
        promptEl.textContent = `第 ${curM} / ${totM} 試合が終了しました${exStr}。`;
      }
      if (nextMatchBtnText) {
        nextMatchBtnText.innerHTML = this.data.enableCardExchange
          ? '次の試合へ (座席継続・カード交換へ)'
          : '次の試合へ (席替えランダム・直接配札)';
      }

      const nModal = document.getElementById('next-game-modal');
      if (nModal) nModal.classList.add('active');
    } else {
      const outcome = this.evaluateStageOutcome();
      this.handleFinalStageOutcome(outcome, matchWinnerSeat);
    }
  },

  evaluateStageOutcome() {
    const statsList = Object.values(this.data.stageMatchStats || {});
    if (statsList.length === 0) return { isCleared: false, playerStats: null, bestStats: null, summary: [], awards: [] };

    const calculated = statsList.map(item => {
      const g = Math.max(1, item.games);
      return {
        ...item,
        dfRate: (item.df / g) * 100,
        avgRank: parseFloat((item.rankSum / g).toFixed(2))
      };
    });

    const maxDf = Math.max(...calculated.map(c => c.df));
    const bestAvg = Math.min(...calculated.map(c => c.avgRank));

    const pStats = calculated.find(c => c.isPlayer);
    const hasPlayerWonAtLeastOnce = pStats ? (pStats.df > 0) : false;

    const competitorsWithMaxDf = calculated.filter(c => c.df === maxDf);
    const isPlayerTopDf = hasPlayerWonAtLeastOnce && (pStats.df === maxDf) && (pStats.avgRank === Math.min(...competitorsWithMaxDf.map(c => c.avgRank)));

    const isPlayerTopAvg = hasPlayerWonAtLeastOnce && (pStats.avgRank === bestAvg);
    const isCleared = hasPlayerWonAtLeastOnce && (isPlayerTopDf || isPlayerTopAvg);

    const sorted = [...calculated].sort((a, b) => {
      if (isCleared) {
        if (a.isPlayer) return -1;
        if (b.isPlayer) return 1;
      }
      if (b.df !== a.df) return b.df - a.df;
      return a.avgRank - b.avgRank;
    });

    const awards = [];
    const maxEight = Math.max(...calculated.map(c => c.eightCuts));
    if (maxEight > 0) {
      const cutter = calculated.find(c => c.eightCuts === maxEight);
      if (cutter) awards.push({ title: '⚔️ 刃金ノ親権者 (最多8切り賞)', holder: cutter.name, detail: `${maxEight}回発動` });
    }
    const maxRev = Math.max(...calculated.map(c => c.revolutions));
    if (maxRev > 0) {
      const revver = calculated.find(c => c.revolutions === maxRev);
      if (revver) awards.push({ title: '🔥 混沌ノ革命主 (最多革命賞)', holder: revver.name, detail: `${maxRev}回樹立` });
    }

    return {
      isCleared: isCleared,
      hasWonAtLeastOnce: hasPlayerWonAtLeastOnce,
      isTopDf: isPlayerTopDf,
      isTopAvg: isPlayerTopAvg,
      playerStats: pStats,
      bestStats: sorted[0],
      summary: sorted,
      awards: awards
    };
  },

  handleFinalStageOutcome(outcome, lastMatchWinnerSeat) {
    const clearModal = document.getElementById('modal-stage-clear');
    const iconEl = document.getElementById('clear-result-icon');
    const titleEl = document.getElementById('clear-result-title');
    const msgEl = document.getElementById('clear-result-msg');
    const scoresTable = document.getElementById('clear-scores-table');
    const returnBtn = document.getElementById('btn-return-to-map');
    const retryBtn = document.getElementById('btn-retry-stage');
    const restartBtn = document.getElementById('btn-restart-scenario');
    const wImg = document.getElementById('stage-clear-winner-img');
    const wName = document.getElementById('stage-clear-winner-name');
    const wPlateTitle = document.querySelector('#stage-clear-winner-plate .modal-winner-title');
    const winnerPlate = document.getElementById('stage-clear-winner-plate');
    const grandSaveBox = document.getElementById('scenario-grand-save-box');

    // ★【上部見切れ解消・縦スクロール対応】モーダル内部コンテナのスタイル保証
    if (clearModal) {
      const modalContent = clearModal.querySelector('.modal-content') || clearModal.firstElementChild || clearModal;
      if (modalContent) {
        modalContent.style.maxHeight = '88vh';
        modalContent.style.overflowY = 'auto';
        modalContent.style.webkitOverflowScrolling = 'touch';
        modalContent.style.overscrollBehavior = 'contain';
        modalContent.style.paddingBottom = '32px';
        modalContent.style.boxSizing = 'border-box';
        modalContent.scrollTop = 0; // 最上部へリセット
      }
    }

    // ★【下部ボタン群の均等化配置】
    const buttonsWrap = returnBtn ? returnBtn.parentElement : null;
    if (buttonsWrap) {
      buttonsWrap.style.display = 'flex';
      buttonsWrap.style.flexDirection = 'column';
      buttonsWrap.style.gap = '8px';
      buttonsWrap.style.width = '100%';
      buttonsWrap.style.boxSizing = 'border-box';
    }

    // ★【敗北時（DEFEAT）も含めたログ保存ボタンの常時展開】
    if (grandSaveBox) {
      grandSaveBox.classList.remove('is-hidden');
      grandSaveBox.style.width = '100%';
      grandSaveBox.style.margin = '0 0 4px 0';
      this.bindScenarioLogSaveActions();
    }

    const isCleared = outcome.isCleared;
    const pAvatar = this.getCurrentAvatar();
    const curPhase = this.data.currentPhase;

    let tier = 1;
    if (curPhase.startsWith('STAGE_3_') || curPhase === 'COMPLETED') tier = 3;
    else if (curPhase.startsWith('STAGE_2_')) tier = 2;

    document.querySelectorAll('.champion-particle').forEach(p => p.remove());

    if (winnerPlate) {
      winnerPlate.classList.remove('is-champion-plate', 'is-tier1-champion', 'is-tier2-champion', 'is-tier3-champion');
    }

    if (isCleared) {
      soundMgr.playFanfare(tier);
      this.spawnGoldParticles(clearModal, tier);

      if (winnerPlate) {
        winnerPlate.classList.add('is-champion-plate', `is-tier${tier}-champion`);
      }

      if (wImg) wImg.src = pAvatar.image;
      if (wName) wName.textContent = getPlayerDisplayName('player');

      if (iconEl) iconEl.textContent = tier === 3 ? '⚡' : (tier === 2 ? '⚜️' : '👑');
      if (titleEl) {
        titleEl.textContent = tier === 3 ? '👑 MYTHIC CLEAR! 神話制覇' : (tier === 2 ? '👑 ROYAL CLEAR! 王宮制覇' : '👑 STAGE CLEAR! 関門突破');
      }

      if (wPlateTitle) {
        if (tier === 3) wPlateTitle.innerHTML = '⚡ MYTHIC SUPREME CHAMPION ⚡';
        else if (tier === 2) wPlateTitle.innerHTML = '⚜️ ROYAL PALACE CHAMPION ⚜️';
        else wPlateTitle.innerHTML = '⚔️ PRELIMINARY CHAMPION ⚔️';
      }

      let badgeHtml = '';
      let reasonText = '';
      if (outcome.isTopDf && outcome.isTopAvg) {
        badgeHtml = `<div class="honor-medal-badge gold-dual">👑 DOUBLE CHAMPION 👑 大富豪率 ＆ 平均順位 W首位制覇！</div>`;
        reasonText = '大富豪率・平均順位ともに堂々の第1位を獲得！ 他の追随を許さぬ圧倒的実力を示しました。';
      } else if (outcome.isTopDf) {
        badgeHtml = `<div class="honor-medal-badge gold-df">🏆 TOP WINNER 🏆 大富豪率 No.1（最多 ${outcome.playerStats.df}勝 獲得）</div>`;
        reasonText = `最多の大富豪獲得数（${outcome.playerStats.df}勝）を叩き出し、大富豪率第1位を達成！`;
      } else {
        badgeHtml = `<div class="honor-medal-badge gold-avg">🛡️ BEST SCORER 🛡️ 平均順位 No.1（平均 ${outcome.playerStats.avgRank}位 キープ）</div>`;
        reasonText = `安定した上位キープにより平均順位第1位（平均 ${outcome.playerStats.avgRank}位）を達成！`;
      }

      if (msgEl) {
        msgEl.innerHTML = `
          ${badgeHtml}
          <div style="margin-top:6px; line-height: 1.5;">見事な手札さばきで試練を突破しました！ ${reasonText} 次のステージへの道が開かれます。</div>
        `;
      }

      this.advancePhase();

      if (retryBtn) retryBtn.classList.add('is-hidden');
      if (restartBtn) restartBtn.classList.add('is-hidden');
    } else {
      soundMgr.playTone(180, 70, 'sawtooth', 0.4, 0.25);
      if (wPlateTitle) wPlateTitle.textContent = 'STAGE TOP';
      const bestId = outcome.bestStats.charId;
      if (wImg) wImg.src = outcome.bestStats.isPlayer ? pAvatar.image : (CHAR_IMAGES[bestId] || 'fugo-絵柄/king.png');
      if (wName) wName.textContent = outcome.bestStats.name;

      if (iconEl) iconEl.textContent = '💀';
      if (titleEl) titleEl.textContent = 'DEFEAT... 突破ならず';
      
      let failDetail = '規定試合を消化しましたが、突破条件（最低1勝以上 ＋ 大富豪率または平均順位1位）を満たせませんでした。';
      if (!outcome.hasWonAtLeastOnce) {
        failDetail = '関門を突破するには、規定試合の中で【最低1回以上の大富豪獲得】が必要です。一度も1位を取れずに平均順位のみで通過することはできません。';
      }
      if (msgEl) msgEl.textContent = `${failDetail} 戦略を練り直して再挑戦してください。`;

      if (retryBtn) {
        retryBtn.classList.remove('is-hidden');
        retryBtn.style.width = '100%';
        retryBtn.style.margin = '0';
        retryBtn.onclick = () => {
          if (clearModal) clearModal.classList.remove('active');
          this.data.stageMatchStats = {};
          this.data.stageRankHistory = [];
          this.data.currentMatchIndex = 1;
          this.currentSeatRoster = null;
          if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
          previousRanks = {};
          this.save();
          this.startScenarioMatchEngine();
        };
      }

      if (restartBtn) {
        restartBtn.classList.remove('is-hidden');
        restartBtn.style.width = '100%';
        restartBtn.style.margin = '0';
        restartBtn.onclick = () => {
          if (confirm('シナリオを最初からやり直しますか？\n（ステージ進行状況がリセットされますが、一度解放したキャラクターは保持されます）')) {
            if (clearModal) clearModal.classList.remove('active');
            terminateCurrentSession();
            this.reset();
          }
        };
      }
    }

    if (returnBtn) {
      returnBtn.style.width = '100%';
      returnBtn.style.margin = '0';
      returnBtn.onclick = () => {
        if (clearModal) clearModal.classList.remove('active');
        this.isActive = false;
        this.data.stageMatchStats = {};
        this.data.stageRankHistory = [];
        if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
        previousRanks = {};
        this.save();
        this.openMapScreen();
      };
    }

    if (scoresTable) {
      let html = `
        <div class="stage-result-summary-header">
          【全${this.data.matchesPerStage}試合 トータル関門突破判定】
        </div>
        <div class="ranking-table-container">
          <table class="ranking-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">関門結果</th>
                <th>参加者</th>
                <th style="text-align: right;">平均順位</th>
                <th style="text-align: right;">大富豪率</th>
                <th style="text-align: center; white-space: nowrap !important; min-width: 98px;">大 / 富 / 貧 / 大貧</th>
              </tr>
            </thead>
            <tbody>
      `;

      outcome.summary.forEach((item, idx) => {
        const isMe = item.isPlayer;
        const rowStyle = isMe ? ' style="background: rgba(212,175,55,0.18); font-weight: bold;"' : '';
        const avatarSrc = isMe ? pAvatar.image : (CHAR_IMAGES[item.charId] || 'fugo-絵柄/king.png');
        const dfRateStr = item.dfRate.toFixed(1);
        const displayName = isMe ? getPlayerDisplayName('player', true) : `${item.icon} ${item.name}`;

        let statusBadge = '';
        if (isCleared && isMe) {
          statusBadge = `<span class="status-cleared-badge">👑 突破</span>`;
        } else {
          statusBadge = `<span class="status-failed-badge">${idx + 1}位</span>`;
        }

        const isTopAvg = (isMe && outcome.isTopAvg);
        const isTopDf = (isMe && outcome.isTopDf);
        const avgClass = isTopAvg ? ' class="stat-highlight-gold"' : '';
        const dfClass = isTopDf ? ' class="stat-highlight-gold"' : '';
        const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[item.charId === 'player' ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.charId)]) ? ` <span class="foul-badge">(${foulPlayers[item.charId === 'player' ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.charId)]})</span>` : '';

        html += `
          <tr${rowStyle}>
            <td style="text-align: center;">${statusBadge}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 4px;">
                <img src="${avatarSrc}" onerror="this.onerror=null; this.src='boy.png';" style="width: 20px; aspect-ratio: 2/3; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4);" alt="">
                <span style="color: ${isMe ? '#fff3a8' : '#e0e6ed'};">${displayName}</span>
              </div>
            </td>
            <td style="text-align: right; color: #ffd700; font-weight: 800;"${avgClass}>${item.avgRank}位</td>
            <td style="text-align: right; color: #fff3a8;"${dfClass}>${dfRateStr}%</td>
            <td style="text-align: center; white-space: nowrap !important;">
              ${renderRankCountBadges(item.df, item.f, item.h, item.dh)}${foulSuffix}
            </td>
          </tr>
        `;
      });

      html += `</tbody></table></div>`;

      if (outcome.awards && outcome.awards.length > 0) {
        html += `<div class="stage-awards-container">`;
        outcome.awards.forEach(a => {
          html += `
            <div class="stage-award-badge">
              <span class="award-title">${a.title}:</span>
              <span class="award-holder">${a.holder}</span>
              <span class="award-detail">(${a.detail})</span>
            </div>
          `;
        });
        html += `</div>`;
      }

      scoresTable.innerHTML = html;
    }

    if (clearModal) clearModal.classList.add('active');

    // ★【シナリオ関門突破 折れ線グラフ描画完全連動（英傑名凡例の完全同期）】
    setTimeout(() => {
      const chartCanvas = document.getElementById('stage-clear-chart');
      const chartLegend = document.getElementById('stage-clear-chart-legend');
      if (chartCanvas && typeof renderSharedRankChart === 'function') {
        const opponentKeys = [
          assignedCharacters.cpu1?.id || 'cpu1',
          assignedCharacters.cpu2?.id || 'cpu2',
          assignedCharacters.cpu3?.id || 'cpu3'
        ];
        renderSharedRankChart(
          chartCanvas,
          chartLegend,
          this.data.stageRankHistory || [],
          this.data.matchesPerStage || 1,
          'player',
          opponentKeys,
          true
        );
      }
    }, 120);
  },

  advancePhase() {
    const data = this.data;
    const p = data.currentPhase;

    if (p.startsWith('STAGE_1')) {
      const gKey = data.selectedPrelimGroup || 'A';
      data.clearedPrelimGroups[gKey] = true;
      const allCleared = data.clearedPrelimGroups.A && data.clearedPrelimGroups.B && data.clearedPrelimGroups.C;
      if (allCleared) {
        data.currentPhase = 'STAGE_2_YOUNG_KING';
        data.pendingAdvStory = 'STAGE_1_CLEAR';
      } else {
        const remainingGroup = ['A', 'B', 'C'].find(k => !data.clearedPrelimGroups[k]);
        data.selectedPrelimGroup = remainingGroup || 'A';
      }
    } else if (p === 'STAGE_2_YOUNG_KING') {
      data.unlockedSecrets.YOUNG_KING = true;
      GameStorage.saveUnlockedChar('BEGINNER_AI');
      data.currentPhase = 'STAGE_2_KING';
      data.pendingAdvStory = 'BOSS_YOUNG_KING_DEFEATED';
    } else if (p === 'STAGE_2_KING') {
      data.unlockedSecrets.QUEEN = true;
      data.currentPhase = 'STAGE_2_QUEEN';
      data.pendingAdvStory = 'BOSS_KING_DEFEATED';
    } else if (p === 'STAGE_2_QUEEN') {
      data.unlockedSecrets.AWAKENED_KING = true;
      GameStorage.saveUnlockedChar('SUPER_AI');
      data.currentPhase = 'STAGE_2_AWAKENED_KING';
      data.pendingAdvStory = 'BOSS_QUEEN_DEFEATED';
    } else if (p === 'STAGE_2_AWAKENED_KING') {
      GameStorage.saveUnlockedChar('AWAKENED_KING');
      GameStorage.saveUnlockedChar('NOBUNAGA');
      data.currentPhase = 'STAGE_3_NOBUNAGA';
      data.pendingAdvStory = 'STAGE_2_CLEAR';
    } else if (p === 'STAGE_3_NOBUNAGA') {
      GameStorage.saveUnlockedChar('SHOTOKU');
      data.currentPhase = 'STAGE_3_SHOTOKU';
      data.pendingAdvStory = 'BOSS_NOBUNAGA_DEFEATED';
    } else if (p === 'STAGE_3_SHOTOKU') {
      GameStorage.saveUnlockedChar('SHI_HUANGDI');
      data.currentPhase = 'STAGE_3_SHI_HUANGDI';
      data.pendingAdvStory = 'BOSS_SHOTOKU_DEFEATED';
    } else if (p === 'STAGE_3_SHI_HUANGDI') {
      GameStorage.saveUnlockedChar('ALEXANDER');
      data.currentPhase = 'STAGE_3_ALEXANDER';
      data.pendingAdvStory = 'BOSS_SHI_HUANGDI_DEFEATED';
    } else if (p === 'STAGE_3_ALEXANDER') {
      GameStorage.saveUnlockedChar('GILGAMESH');
      data.currentPhase = 'STAGE_3_GILGAMESH';
      data.pendingAdvStory = 'BOSS_ALEXANDER_DEFEATED';
    } else if (p === 'STAGE_3_GILGAMESH') {
      data.currentPhase = 'COMPLETED';
      data.pendingAdvStory = 'ENDING';
    }

    this.currentSeatRoster = null;
    if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
    previousRanks = {};
    this.data.stageMatchStats = {};
    this.data.stageRankHistory = [];
    this.data.currentMatchIndex = 1;
    this.save();

    StartSetupManager.renderPlayerCharGrid();
    StartSetupManager.renderOpponentsGrid();
    updateCharIntroVisibility();
  },

  proceedNextScenarioMatch() {
    const nextGameModal = document.getElementById('next-game-modal');
    if (nextGameModal) nextGameModal.classList.remove('active');

    const modalNext = document.getElementById('modal-scenario-next-match');
    if (modalNext) modalNext.classList.remove('active');

    this.data.currentMatchIndex++;
    this.save();

    this.startScenarioMatchEngine();
  },

  spawnGoldParticles(containerEl, tier = 1) {
    if (!containerEl) return;
    const count = (tier === 3) ? 65 : (tier === 2 ? 36 : 16);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = `champion-particle tier-${tier}`;
      const size = (tier === 3) ? (Math.floor(Math.random() * 10) + 4) : (Math.floor(Math.random() * 7) + 3);
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 96}%`;
      p.style.animationDelay = `${(Math.random() * 1.8).toFixed(2)}s`;
      p.style.animationDuration = `${(Math.random() * 1.6 + (tier === 3 ? 1.6 : 2.2)).toFixed(2)}s`;
      containerEl.appendChild(p);
    }
  },

  openCharsModal() {
    soundMgr.playSelect();
    const modal = document.getElementById('modal-scenario-chars');
    if (!modal) return;

    const rivalsBox = document.getElementById('scenario-current-rivals-box');
    const rivalsGrid = document.getElementById('scenario-current-rivals-grid');

    const battlingCharIds = PLAYERS.map(cpu => assignedCharacters[cpu]?.id).filter(Boolean);

    if (this.isActive) {
      if (rivalsBox) rivalsBox.classList.remove('is-hidden');
      if (rivalsGrid) {
        rivalsGrid.innerHTML = '';
        ['cpu1', 'cpu2', 'cpu3'].forEach(cpu => {
          const opp = assignedCharacters[cpu];
          if (!opp) return;
          const card = document.createElement('div');
          card.className = 'scenario-rival-card is-currently-battling';
          card.innerHTML = `
            <img class="scenario-rival-thumb" src="${CHAR_IMAGES[opp.id] || ''}" onerror="this.onerror=null; this.src='${opp.id.toLowerCase()}.png';" alt="${opp.name}">
            <div class="scenario-rival-info">
              <div class="scenario-rival-name">${opp.icon || '⚔️'} ${opp.name} <span style="font-size:9px; color:#ffd700;">(対戦中)</span></div>
              <div class="scenario-rival-role">${CHAR_SHORT_DESC[opp.id] || '対戦相手'}</div>
            </div>
          `;
          rivalsGrid.appendChild(card);
        });
      }
    } else {
      if (rivalsBox) rivalsBox.classList.add('is-hidden');
    }

    const gridNobles = document.getElementById('category-grid-nobles');
    if (gridNobles) {
      gridNobles.innerHTML = '';
      this.PRELIM_NOBLES.forEach(c => {
        const isBattling = this.isActive && battlingCharIds.includes(c.id);
        const card = document.createElement('div');
        card.className = `scenario-char-info-card${isBattling ? ' is-currently-battling' : ''}`;
        card.innerHTML = `
          <img class="scenario-char-thumb" src="${c.img}" onerror="this.onerror=null; this.src='${c.id.toLowerCase()}.png';" alt="${c.name}">
          <div class="scenario-char-text-col">
            <div class="scenario-char-name-line">
              <span class="scenario-char-name">${c.icon} ${c.name} ${isBattling ? '<span style="font-size:9px; color:#ffd700;">⚔️対戦中</span>' : ''}</span>
              <span class="scenario-char-role-badge">${c.role}</span>
            </div>
            <div class="scenario-char-desc">${c.desc}</div>
          </div>
        `;
        gridNobles.appendChild(card);
      });
    }

    const gridRoyals = document.getElementById('category-grid-royals');
    if (gridRoyals) {
      gridRoyals.innerHTML = '';
      const royalsList = [
        this.ROYAL_BOSSES.YOUNG_KING,
        this.ROYAL_BOSSES.KING,
        this.ROYAL_BOSSES.QUEEN,
        this.ROYAL_BOSSES.AWAKENED_KING
      ];
      royalsList.forEach(c => {
        const isQueenSecret = (c.id === 'SUPER_AI' && !this.data.unlockedSecrets.QUEEN && this.data.currentPhase !== 'STAGE_2_QUEEN' && this.data.currentPhase !== 'STAGE_2_AWAKENED_KING' && !this.data.currentPhase.startsWith('STAGE_3_') && this.data.currentPhase !== 'COMPLETED');
        const isAwakenedSecret = (c.id === 'AWAKENED_KING' && !this.data.unlockedSecrets.AWAKENED_KING && this.data.currentPhase !== 'STAGE_2_AWAKENED_KING' && !this.data.currentPhase.startsWith('STAGE_3_') && this.data.currentPhase !== 'COMPLETED');

        const isSecret = isQueenSecret || isAwakenedSecret;
        const dispName = isSecret ? '？？？' : c.name;
        const dispRole = isSecret ? 'シークレット' : c.title;
        const dispImg = isSecret ? c.secretImg : c.img;
        const dispDesc = isSecret ? '王宮の深部に佇む謎の王族。関門を突破することで正体が明らかになる。' : c.desc;
        const isBattling = this.isActive && battlingCharIds.includes(c.id);

        const card = document.createElement('div');
        card.className = `scenario-char-info-card${isBattling ? ' is-currently-battling' : ''}`;
        card.innerHTML = `
          <img class="scenario-char-thumb" src="${dispImg}" onerror="this.onerror=null; this.src='${c.id.toLowerCase()}.png';" alt="${dispName}">
          <div class="scenario-char-text-col">
            <div class="scenario-char-name-line">
              <span class="scenario-char-name">${c.icon} ${dispName} ${isBattling ? '<span style="font-size:9px; color:#ffd700;">⚔️対戦中</span>' : ''}</span>
              <span class="scenario-char-role-badge">${dispRole}</span>
            </div>
            <div class="scenario-char-desc">${dispDesc}</div>
          </div>
        `;
        gridRoyals.appendChild(card);
      });
    }

    const heroesSection = document.getElementById('scenario-category-heroes-section');
    const gridHeroes = document.getElementById('category-grid-heroes');
    const curPhase = this.data.currentPhase;

    const heroSequence = [
      { phase: 'STAGE_3_NOBUNAGA', obj: this.HEROIC_BOSSES.NOBUNAGA },
      { phase: 'STAGE_3_SHOTOKU', obj: this.HEROIC_BOSSES.SHOTOKU },
      { phase: 'STAGE_3_SHI_HUANGDI', obj: this.HEROIC_BOSSES.SHI_HUANGDI },
      { phase: 'STAGE_3_ALEXANDER', obj: this.HEROIC_BOSSES.ALEXANDER },
      { phase: 'STAGE_3_GILGAMESH', obj: this.HEROIC_BOSSES.GILGAMESH }
    ];
    const phaseOrder = ['STAGE_3_NOBUNAGA', 'STAGE_3_SHOTOKU', 'STAGE_3_SHI_HUANGDI', 'STAGE_3_ALEXANDER', 'STAGE_3_GILGAMESH', 'COMPLETED'];
    const curPhaseIdx = phaseOrder.indexOf(curPhase);

    if (curPhaseIdx === -1) {
      if (heroesSection) heroesSection.classList.add('is-hidden');
    } else {
      if (heroesSection) heroesSection.classList.remove('is-hidden');
      if (gridHeroes) {
        gridHeroes.innerHTML = '';
        for (let i = 0; i <= Math.min(curPhaseIdx, 4); i++) {
          const item = heroSequence[i];
          const isBattling = this.isActive && battlingCharIds.includes(item.obj.id);
          const card = document.createElement('div');
          card.className = `scenario-char-info-card is-epic-hero${isBattling ? ' is-currently-battling' : ''}`;
          card.innerHTML = `
            <img class="scenario-char-thumb" src="${item.obj.img}" onerror="this.onerror=null; this.src='${item.obj.id.toLowerCase()}.png';" alt="${item.obj.name}">
            <div class="scenario-char-text-col">
              <div class="scenario-char-name-line">
                <span class="scenario-char-name">${item.obj.icon} ${item.obj.name} ${isBattling ? '<span style="font-size:9px; color:#ffd700;">⚔️対戦中</span>' : ''}</span>
                <span class="scenario-char-role-badge">${item.obj.title}</span>
              </div>
              <div class="scenario-char-desc">${item.obj.desc}</div>
            </div>
          `;
          gridHeroes.appendChild(card);
        }
      }
    }

    modal.classList.add('active');
  },

  openRulesModal() {
    soundMgr.playSelect();
    const modal = document.getElementById('modal-scenario-rules');
    const stageList = document.getElementById('scenario-rules-dynamic-stages');
    if (!modal) return;

    if (stageList) {
      const data = this.data;
      const p = data.currentPhase;
      const isStage2Reached = p.startsWith('STAGE_2_') || p.startsWith('STAGE_3_') || p === 'COMPLETED';
      const isStage3Reached = p.startsWith('STAGE_3_') || p === 'COMPLETED';

      let html = `
        <li><strong>【Stage 1: 宮廷予選】</strong> 初期9名の貴族がA/B/Cチームに分かれて立ちはだかります。好きなグループから挑戦可能で、規定対戦数を戦い抜き、<strong>『最低1回以上の大富豪獲得』を達成した上で</strong>、「大富豪率が第1位」または「平均順位が第1位」を獲得すると関門突破となります。全3グループを制覇すると玉座の間への拝謁が許可されます。</li>
      `;

      if (!isStage2Reached) {
        html += `<li><strong>【Stage 2: 玉座の試練】</strong> ？？？？？（予選トーナメント3グループ制覇後に解禁）</li>`;
      } else {
        let stage2Text = '玉座の間にて若き王子「新王」が腕試しとして立ちはだかります。';
        stage2Text += '新王を破ると父たる絶対君主「王」が威厳を持って立ち塞がり、';
        if (data.unlockedSecrets.QUEEN || p === 'STAGE_2_QUEEN' || p === 'STAGE_2_AWAKENED_KING' || isStage3Reached) {
          stage2Text += '宮廷の真の主たる母「女王」が立ちはだかり、';
        }
        if (data.unlockedSecrets.AWAKENED_KING || p === 'STAGE_2_AWAKENED_KING' || isStage3Reached) {
          stage2Text += '最終頂上決戦、過酷な修練の末に覚醒した「覚醒新王」が君臨します！';
        }
        html += `<li><strong>【Stage 2: 玉座の試練】</strong> ${stage2Text}（最低1勝以上 ＋ 大富豪率または平均順位1位で突破）</li>`;
      }

      if (!isStage3Reached) {
        html += `<li><strong>【Stage 3: ？？？？】</strong> ？？？？？？？？（王宮の頂点・覚醒新王撃破後に解禁される神話の領域）</li>`;
      } else {
        const heroNames = [];
        if (p === 'STAGE_3_NOBUNAGA') heroNames.push('第六天魔王「織田信長」');
        else if (p === 'STAGE_3_SHOTOKU') heroNames.push('織田信長', '大賢人「聖徳太子」');
        else if (p === 'STAGE_3_SHI_HUANGDI') heroNames.push('織田信長', '聖徳太子', '中華統一「秦の始皇帝」');
        else if (p === 'STAGE_3_ALEXANDER') heroNames.push('織田信長', '聖徳太子', '始皇帝', '征服王「アレク王」');
        else heroNames.push('織田信長', '聖徳太子', '始皇帝', 'アレク王', '原初の覇王「ギルガメッシュ」');

        html += `<li><strong>【Stage 3: 歴史の英傑】</strong> 王宮制圧後、時空を超えて顕現した最強の英雄たち（${heroNames.join('、')}）が立ちはだかります！ 各英傑との直接対決を制し、全シナリオ完全制覇を目指してください。</li>`;
      }

      html += `
        <li style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(212,175,55,0.3); color: #fff3a8;">
          <strong>【都落ち・禁止あがり（本格競技ルール採用）】</strong> 本作では本格競技ルールを採用しています。前局の大富豪が1位になれなかった瞬間に大貧民へ転落する「都落ち」、および手札の最後の1手としてJOKER、2（革命時は3）、8、♠3単騎（平時のみ）を出してあがる「禁止あがり（即時失格・反則負け）」が厳格に適用されます。
        </li>
      `;

      stageList.innerHTML = html;
    }

    modal.classList.add('active');
  }
};
