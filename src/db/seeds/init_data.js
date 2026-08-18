exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("professions").del();
  await knex("items").del();

  // Insert Professions
  await knex("professions").insert([
    { id: 1, name: "Dehqon", description: "Bug'doy va paxta yetishtiradi." },
    { id: 2, name: "Tegirmonchi", description: "Bug'doyni unga aylantiradi." },
    { id: 3, name: "Novvoy", description: "Undan non pishiradi." },
    { id: 4, name: "Konchi", description: "Tosh va temir rudasi qazib oladi." },
    { id: 5, name: "O'rmonchi", description: "Yog'och kesadi." },
    { id: 6, name: "Temirchi", description: "Asbob-uskunalar yasaydi." },
  ]);

  // Insert Items
  await knex("items").insert([
    {
      id: 1,
      name: "Bug'doy",
      type: "resource",
      energy_value: 0,
      description: "Tegirmonchi un qilish uchun ishlatadi.",
    },
    {
      id: 2,
      name: "Paxta",
      type: "resource",
      energy_value: 0,
      description: "Kiyim-kechak uchun asosiy xom-ashyo.",
    },
    {
      id: 3,
      name: "Un",
      type: "resource",
      energy_value: 0,
      description: "Novvoy non pishirishi uchun zarur.",
    },
    {
      id: 4,
      name: "Non",
      type: "food",
      energy_value: 50,
      description: "Asosiy energiya manbai.",
    },
    {
      id: 5,
      name: "Tosh",
      type: "resource",
      energy_value: 0,
      description: "Qurilish materiali.",
    },
    {
      id: 6,
      name: "Temir rudasi",
      type: "resource",
      energy_value: 0,
      description: "Asboblar yasash uchun xom-ashyo.",
    },
    {
      id: 7,
      name: "Yog'och",
      type: "resource",
      energy_value: 0,
      description: "Qurilish va olov uchun.",
    },
    {
      id: 8,
      name: "Asbob",
      type: "tool",
      energy_value: 0,
      description: "Ish samaradorligini oshirish uchun.",
    },
  ]);
};
