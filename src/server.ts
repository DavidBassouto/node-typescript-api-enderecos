/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from "express";
import oracle from "oracledb";

const app = express();
app.use(express.json());

let conexao: any = null;

//#region SERVICES
async function abrirConexao() {
  if (conexao == null) {
    console.log("TENTANDO ABRIR CONEXÃO...");
    conexao = await oracle.getConnection({
      user: "C##NODE",
      password: "node",
      connectionString: "localhost:1521/XE",
    });
    console.log("ABRIU CONEXÃO");
  }
}

async function fecharConexao() {
  if (conexao != null) {
    console.log("TENTANDO FECHAR CONEXÃO...");
    conexao.close();
    conexao = null;
    console.log("CONEXÃO ENCERRADA");
  }
}

async function gerarSequence(nomeSequence: string) {
  const sqlSequence =
    "SELECT " + nomeSequence + ".NEXTVAL AS CODIGO FROM DUAL";
  const resultSet = await conexao.execute(sqlSequence);
  const sequence = resultSet.rows[0][0];
  console.log(
    "SEQUENCE GERADA PARA " + nomeSequence + " - " + sequence,
  );
  return sequence;
}

async function commit() {
  if (conexao != null) {
    await conexao.commit();
  }
}

async function rollback() {
  if (conexao != null) {
    await conexao.rollback();
  }
}

async function varificarExistenciaUF(sigla: string, nome: string) {
  const listaUFs = [];
  await abrirConexao();
  let sql = "SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF";
  sql += ` WHERE NOME='${nome}' AND SIGLA='${sigla}'`;

  console.log("*****************SQL: ", sql);

  const resultado = await conexao.execute(sql);
  let numeroLinha = 0;
  let numeroColuna = 0;
  const quantidadeResultados = resultado.rows.length;

  while (numeroLinha < quantidadeResultados) {
    const ufVo = {
      codigoUF: resultado.rows[numeroLinha][numeroColuna++],
      sigla: resultado.rows[numeroLinha][numeroColuna++],
      nome: resultado.rows[numeroLinha][numeroColuna++],
      status: resultado.rows[numeroLinha][numeroColuna++],
    };
    listaUFs.push(ufVo);
    numeroLinha++;
    numeroColuna = 0;
  }
  await fecharConexao();

  return listaUFs[0];
}
//#endregion

//#region GET UF

app.get("/uf", function (request, response) {
  return consultarUF(request, response);
});

async function consultarUF(request: Request, response: Response) {
  const listaUFs = [];
  await abrirConexao();
  let sql = "SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF";
  const queryParams = [];
  const queryKeys = ["codigoUF", "sigla", "nome", "status"];

  for (let key of queryKeys) {
    if (request.query[key]) {
      if (key == "codigoUF") {
        key = "codigo_uf";
        queryParams.push(
          `${key.toUpperCase()}= '${request.query["codigoUF"]}'`,
        );
      } else {
        queryParams.push(
          `${key.toUpperCase()}= '${request.query[key]}'`,
        );
      }
    }
  }

  if (queryParams.length > 0) {
    sql += ` WHERE ${queryParams.join(" AND ")}`;
  }

  console.log("*****************SQL: ", sql);

  const resultado = await conexao.execute(sql);
  let numeroLinha = 0;
  let numeroColuna = 0;
  const quantidadeResultados = resultado.rows.length;

  while (numeroLinha < quantidadeResultados) {
    const ufVo = {
      codigoUF: resultado.rows[numeroLinha][numeroColuna++],
      sigla: resultado.rows[numeroLinha][numeroColuna++],
      nome: resultado.rows[numeroLinha][numeroColuna++],
      status: resultado.rows[numeroLinha][numeroColuna++],
    };
    listaUFs.push(ufVo);
    numeroLinha++;
    numeroColuna = 0;
  }

  console.log(resultado.rows);
  await fecharConexao();

  if (
    request.query.codigoUF ||
    request.query.nome ||
    request.query.sigla
  ) {
    if (listaUFs.length == 0) {
      return response.status(200).json(listaUFs);
    } else {
      return response.status(200).json(listaUFs[0]);
    }
  }

  response.status(200).json(listaUFs);
}
//#endregion

//#region  POST UF
app.post("/uf", async (request, response) => {
  return await adicionarUF(request, response);
});

async function adicionarUF(request: Request, response: Response) {
  try {
    //CAPTURAR OS DADOS QUE VIERAM DA REQUISIÇÃO (FORMATO JSON)
    const ufVo = request.body;

    //VERIFICAR SE SIGLA TEM 2 CARACTERES
    if (ufVo.sigla.length != 2) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter 2 caracteres.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE SIGLA POSSUI NUMEROS
    const regex = /^[A-Za-z\s]+$/;

    if (!regex.test(ufVo.sigla)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE NOME POSSUI NUMEROS

    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }
    
    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await varificarExistenciaUF(
      ufVo.sigla,
      ufVo.nome,
    );
    if (itemDuplicado) {
      const jsonRetorno = {
        status: 400,
        mensagem: "O item já existe no banco de dados.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //ABRIR A CONEXÃO
    await abrirConexao();
    //GERAR UM CÓDIGO POR MEIO DE UMA SEQUENCE
    ufVo.codigoUF = await gerarSequence("SEQUENCE_UF");
    //GERAR O MEU SQL PARA MANDAR GRAVAR NO BANCO DE DADOS
    const sql =
      "INSERT INTO TB_UF (CODIGO_UF, SIGLA, NOME, STATUS) VALUES (:codigoUF, :sigla, :nome, :status)";
    //MANDAR EXECUTAR O MEU SQL PARA GRAVAR
    const resultSet = await conexao.execute(sql, ufVo);
    //VALIDAR SE OS REGISTROS FORAM INSERIDOS OU NÃO
    console.log(
      "FORAM INSERIDOS " +
        resultSet.rowsAffected +
        " REGISTROS NO BANCO DE DADOS",
    );
    //COMMITAR - MANDAR O BANCO GRAVAR REALMENTE O QUE O SQL MANDOU
    await commit();
    await consultarUF(request, response);
  } catch (err) {
    console.log(err);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível incluir UF no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    //FECHAR A CONEXAO
    await fecharConexao();
  }
}
//#endregion POST UF

app.listen(3333, () => {
  console.log("O SERVIDOR FOI INICIADO COM SUCESSO..");
});
