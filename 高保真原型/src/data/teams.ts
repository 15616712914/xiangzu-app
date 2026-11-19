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
    color: "#c8102e",
    accent: "#ffd23f",
    stadium: "长沙市体育中心",
    food: "臭豆腐",
    sight: "岳麓山",
    strength: 1.35,
    slogan: "星城不夜，越战越嗨",
  },
  {
    id: "zz",
    city: "株洲",
    alias: "火车头",
    color: "#1d3f8f",
    accent: "#f2a900",
    stadium: "株洲市体育中心",
    food: "攸县香干",
    sight: "神农城",
    strength: 1.15,
    slogan: "火车头一开，谁都拦不住",
  },
  {
    id: "xt",
    city: "湘潭",
    alias: "莲城",
    color: "#d1477a",
    accent: "#ffffff",
    stadium: "湘潭市体育中心",
    food: "毛家红烧肉",
    sight: "韶山",
    strength: 1.1,
    slogan: "莲城有莲，球场有拳",
  },
  {
    id: "hy",
    city: "衡阳",
    alias: "雁城",
    color: "#0f7b6c",
    accent: "#e9f5db",
    stadium: "衡阳市体育中心",
    food: "衡阳鱼粉",
    sight: "南岳衡山",
    strength: 1.2,
    slogan: "雁阵齐飞，寿比南山",
  },
  {
    id: "sy",
    city: "邵阳",
    alias: "宝庆",
    color: "#6d2e9b",
    accent: "#f6c85f",
    stadium: "邵阳市体育中心",
    food: "猪血丸子",
    sight: "崀山",
    strength: 1.0,
    slogan: "宝庆霸得蛮，九十分钟不服输",
  },
  {
    id: "yy",
    city: "岳阳",
    alias: "巴陵",
    color: "#0a6bb5",
    accent: "#bfe3ff",
    stadium: "岳阳市体育中心",
    food: "洞庭银鱼",
    sight: "岳阳楼",
    strength: 1.25,
    slogan: "先天下之忧，后进球之乐",
  },
  {
    id: "cd",
    city: "常德",
    alias: "桃花源",
    color: "#e0457b",
    accent: "#fff1f5",
    stadium: "常德市体育中心",
    food: "常德米粉",
    sight: "桃花源",
    strength: 1.05,
    slogan: "一碗米粉，满场斗志",
  },
  {
    id: "zjj",
    city: "张家界",
    alias: "武陵",
    color: "#2f6b2f",
    accent: "#d7f0c2",
    stadium: "张家界市体育中心",
    food: "三下锅",
    sight: "天门山",
    strength: 0.9,
    slogan: "绝壁之上，也能破门",
  },
  {
    id: "yiy",
    city: "益阳",
    alias: "银城",
    color: "#7a8597",
    accent: "#ffffff",
    stadium: "益阳市体育中心",
    food: "安化擂茶",
    sight: "安化茶马古道",
    strength: 0.95,
    slogan: "银城出品，越踢越醇",
  },
  {
    id: "cz",
    city: "郴州",
    alias: "林城",
    color: "#00876a",
    accent: "#ffe066",
    stadium: "郴州市体育中心",
    food: "东江鱼",
    sight: "东江湖",
    strength: 1.0,
    slogan: "雾漫东江，球进我网？不存在",
  },
  {
    id: "yz",
    city: "永州",
    alias: "潇湘",
    color: "#b5651d",
    accent: "#ffeacc",
    stadium: "永州市体育中心",
    food: "东安鸡",
    sight: "柳子庙",
    strength: 0.92,
    slogan: "潇湘源头，奔流不息",
  },
  {
    id: "hh",
    city: "怀化",
    alias: "鹤城",
    color: "#1b1b1b",
    accent: "#e63946",
    stadium: "怀化市体育中心",
    food: "芷江鸭",
    sight: "洪江古商城",
    strength: 0.97,
    slogan: "鹤城一飞，冲天而起",
  },
  {
    id: "ld",
    city: "娄底",
    alias: "湘中",
    color: "#9b2226",
    accent: "#f4d35e",
    stadium: "娄底市体育中心",
    food: "新化三合汤",
    sight: "紫鹊界梯田",
    strength: 1.02,
    slogan: "湘中腹地，硬核出击",
  },
  {
    id: "xx",
    city: "湘西",
    alias: "边城",
    color: "#264653",
    accent: "#e9c46a",
    stadium: "吉首市体育中心",
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
  position: Position;
  age: number;
  job: string;
  height: number;
  weight: number;
  foot: "左脚" | "右脚" | "双脚";
  /** Real headshot URL. When absent, a team-colored jersey portrait is drawn instead. */
  photo?: string;
};
