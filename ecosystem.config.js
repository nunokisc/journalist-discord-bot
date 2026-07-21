module.exports = {
  apps: [
    {
      name: "journalist-discord-bot",
      script: "bot.js",
      cwd: "/root/journalist-discord-bot",
      env: {
        // Adicione aqui variáveis de ambiente se precisar
      },
      restart_delay: 5000, // espera 5s antes de reiniciar
      watch: false,        // true se quiser reiniciar ao mudar arquivos
      max_memory_restart: "150M", // rede de segurança: reinicia se a RAM disparar (voltámos ao discord.js v12, mais leve, para caber na RAM disponível)
    },
  ],
};
