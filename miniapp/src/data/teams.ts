export type Team = {
  id: string;
  city: string;
  alias: string;
  color: string;
  accent: string;
  stadium: string;
  food: string;
  sight: string;
  strength: number;
  slogan: string;
};

export const TEAMS: Team[] = [
  {
    id: "cs",
    city: "长沙",
    alias: "星城",
    color: "#C21E1A",
    accent: "#D4AF37",
    stadium: "长沙贺龙体育场",
    food: "臭豆腐",
    sight: "岳麓山",
    strength: 1.35,
    slogan: "星城不夜，越战越嗨",
  },
  {
    id: "zz",
    city: "株洲",
    alias: "火车头",
    color: "#BA2429",
    accent: "#E7E1D6",
    stadium: "株洲体育中心",
    food: "攸县香干",
    sight: "神农城",
    strength: 1.15,
    slogan: "火车头一开，谁都拦不住",
  },
  {
    id: "xt",
    city: "湘潭",
    alias: "莲城",
    color: "#B01E28",
    accent: "#F2D6D0",
    stadium: "湘潭体育中心",
    food: "毛家红烧肉",
    sight: "韶山",
    strength: 1.1,
    slogan: "莲城有莲，球场有拳",
  },
  {
    id: "hy",
    city: "衡阳",
    alias: "雁城",
    color: "#C21E1A",
    accent: "#D4AF37",
    stadium: "衡阳体育场",
    food: "衡阳鱼粉",
    sight: "南岳衡山",
    strength: 1.2,
    slogan: "雁阵齐飞，寿比南山",
  },
  {
    id: "sy",
    city: "邵阳",
    alias: "宝庆",
    color: "#D9772B",
    accent: "#F2E3D0",
    stadium: "邵阳体育场",
    food: "猪血丸子",
    sight: "崀山",
    strength: 1.0,
    slogan: "宝庆霸得蛮，九十分钟不服输",
  },
  {
    id: "yy",
    city: "岳阳",
    alias: "巴陵",
    color: "#C21E1A",
    accent: "#D4AF37",
    stadium: "岳阳奥体中心",
    food: "洞庭银鱼",
    sight: "岳阳楼",
    strength: 1.25,
    slogan: "先天下之忧，后进球之乐",
  },
  {
    id: "cd",
    city: "常德",
    alias: "桃花源",
    color: "#E07A96",
    accent: "#25568D",
    stadium: "常德体育中心",
    food: "常德米粉",
    sight: "桃花源",
    strength: 1.05,
    slogan: "一碗米粉，满场斗志",
  },
  {
    id: "zjj",
    city: "张家界",
    alias: "武陵",
    color: "#2E6B50",
    accent: "#A7D8C9",
    stadium: "张家界贺龙体育中心",
    food: "三下锅",
    sight: "天门山",
    strength: 0.9,
    slogan: "绝壁之上，也能破门",
  },
  {
    id: "yiy",
    city: "益阳",
    alias: "银城",
    color: "#2E7D4F",
    accent: "#D9E6C8",
    stadium: "益阳体育中心",
    food: "安化擂茶",
    sight: "安化茶马古道",
    strength: 0.95,
    slogan: "银城出品，越踢越醇",
  },
  {
    id: "cz",
    city: "郴州",
    alias: "林城",
    color: "#1E6B3A",
    accent: "#F2C230",
    stadium: "郴州体育中心",
    food: "东江鱼",
    sight: "东江湖",
    strength: 1.0,
    slogan: "雾漫东江，球进我网？不存在",
  },
  {
    id: "yz",
    city: "永州",
    alias: "潇湘",
    color: "#1D5FA8",
    accent: "#F2F6FA",
    stadium: "永州体育场",
    food: "东安鸡",
    sight: "柳子庙",
    strength: 0.92,
    slogan: "潇湘源头，奔流不息",
  },
  {
    id: "hh",
    city: "怀化",
    alias: "鹤城",
    color: "#C9A35C",
    accent: "#2B2B2B",
    stadium: "怀化体育中心",
    food: "芷江鸭",
    sight: "洪江古商城",
    strength: 0.97,
    slogan: "鹤城一飞，冲天而起",
  },
  {
    id: "ld",
    city: "娄底",
    alias: "湘中",
    color: "#C21E1A",
    accent: "#24476E",
    stadium: "娄底体育中心",
    food: "新化三合汤",
    sight: "紫鹊界梯田",
    strength: 1.02,
    slogan: "湘中腹地，硬核出击",
  },
  {
    id: "xx",
    city: "湘西",
    alias: "边城",
    color: "#335C8A",
    accent: "#7FB6D9",
    stadium: "凤凰体育场",
    food: "湘西腊肉",
    sight: "凤凰古城",
    strength: 0.88,
    slogan: "边城少年，踢出远方",
  },
];

export const TEAM_MAP: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export type Position = "门将" | "后卫" | "中场" | "前锋";

export type Player = {
  id: string;
  teamId: string;
  number: number;
  name: string;
  /** Official rosters do not publish positions, so this can be empty. */
  position?: string;
  age?: number;
  job?: string;
  height?: number;
  weight?: number;
  foot?: "左脚" | "右脚" | "双脚";
  /** Real headshot URL. When absent, a team-colored jersey portrait is drawn instead. */
  photo?: string;
  /** Real 2026 season totals from the official roster. */
  appearances?: number;
  goals?: number;
  penalties?: number;
  yellow?: number;
  red?: number;
};
