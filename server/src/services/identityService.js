import prisma from "../lib/prisma.js";

const getQueryContacts = async (email, phoneNumber) => {
  const conditions = [];

  if (email) {
    conditions.push({ email });
  }

  if (phoneNumber) {
    conditions.push({ phoneNumber });
  }

  if (!conditions.length) {
    return [];
  }

  return prisma.contact.findMany({
    where: {
      OR: conditions,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
};

const getClusterContacts = async (seedContacts) => {
  const queue = [...seedContacts];
  const seen = new Set(seedContacts.map((item) => item.id));
  const emails = new Set(seedContacts.map((item) => item.email).filter(Boolean));
  const phoneNumbers = new Set(seedContacts.map((item) => item.phoneNumber).filter(Boolean));

  while (queue.length) {
    const current = queue.shift();
    const linkedTargets = [];

    if (current.linkedId) {
      linkedTargets.push({ id: current.linkedId });
    }

    linkedTargets.push({ linkedId: current.id });

    if (current.email) {
      linkedTargets.push({ email: current.email });
    }

    if (current.phoneNumber) {
      linkedTargets.push({ phoneNumber: current.phoneNumber });
    }

    const related = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: linkedTargets,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const contact of related) {
      if (!seen.has(contact.id)) {
        seen.add(contact.id);
        queue.push(contact);
      }

      if (contact.email) {
        emails.add(contact.email);
      }

      if (contact.phoneNumber) {
        phoneNumbers.add(contact.phoneNumber);
      }
    }

    if (emails.size || phoneNumbers.size) {
      const extra = await prisma.contact.findMany({
        where: {
          deletedAt: null,
          OR: [emails.size ? { email: { in: [...emails] } } : undefined, phoneNumbers.size ? { phoneNumber: { in: [...phoneNumbers] } } : undefined].filter(Boolean),
        },
        orderBy: { createdAt: "asc" },
      });

      for (const contact of extra) {
        if (!seen.has(contact.id)) {
          seen.add(contact.id);
          queue.push(contact);
        }
      }
    }
  }

  return prisma.contact.findMany({
    where: {
      id: { in: [...seen] },
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
};

const getPrimaryContact = (contacts) => {
  const sorted = [...contacts].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0) {
      return diff;
    }
    return a.id - b.id;
  });

  const primaryInSorted = sorted.find((item) => item.linkPrecedence === "primary");
  return primaryInSorted || sorted[0];
};

const normalizeLinks = async (contacts, primaryId) => {
  const updates = contacts
    .filter((item) => item.id !== primaryId)
    .map((item) => {
      const shouldBeSecondary = item.linkPrecedence !== "secondary" || item.linkedId !== primaryId;

      if (!shouldBeSecondary) {
        return null;
      }

      return prisma.contact.update({
        where: { id: item.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryId,
        },
      });
    })
    .filter(Boolean);

  if (updates.length) {
    await prisma.$transaction(updates);
  }
};

const createSecondaryIfNeeded = async ({ email, phoneNumber, clusterContacts, primaryId }) => {
  const hasExactMatch = clusterContacts.some((item) => (item.email || null) === (email || null) && (item.phoneNumber || null) === (phoneNumber || null));

  if (hasExactMatch) {
    return;
  }

  const hasNewEmail = email && !clusterContacts.some((item) => item.email === email);
  const hasNewPhone = phoneNumber && !clusterContacts.some((item) => item.phoneNumber === phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: primaryId,
        linkPrecedence: "secondary",
      },
    });
  }
};

const mapResponse = (contacts, primaryId) => {
  const primary = contacts.find((item) => item.id === primaryId);
  const uniqueEmails = [...new Set(contacts.map((item) => item.email).filter(Boolean))];
  const uniquePhones = [...new Set(contacts.map((item) => item.phoneNumber).filter(Boolean))];
  const secondaryContactIds = contacts.filter((item) => item.id !== primaryId).map((item) => item.id);

  if (primary?.email) {
    const rest = uniqueEmails.filter((item) => item !== primary.email);
    uniqueEmails.splice(0, uniqueEmails.length, primary.email, ...rest);
  }

  if (primary?.phoneNumber) {
    const rest = uniquePhones.filter((item) => item !== primary.phoneNumber);
    uniquePhones.splice(0, uniquePhones.length, primary.phoneNumber, ...rest);
  }

  return {
    contact: {
      primaryContatctId: primaryId,
      emails: uniqueEmails,
      phoneNumbers: uniquePhones,
      secondaryContactIds,
    },
  };
};

export const identifyContact = async ({ email, phoneNumber }) => {
  const seedContacts = await getQueryContacts(email, phoneNumber);

  if (!seedContacts.length) {
    const created = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkPrecedence: "primary",
      },
    });

    return {
      contact: {
        primaryContatctId: created.id,
        emails: created.email ? [created.email] : [],
        phoneNumbers: created.phoneNumber ? [created.phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  const clusterContacts = await getClusterContacts(seedContacts);
  const primary = getPrimaryContact(clusterContacts);

  await normalizeLinks(clusterContacts, primary.id);
  await createSecondaryIfNeeded({
    email,
    phoneNumber,
    clusterContacts,
    primaryId: primary.id,
  });

  const refreshed = await getClusterContacts([{ ...primary, linkedId: null }]);
  const primaryAfterRefresh = getPrimaryContact(refreshed);

  return mapResponse(refreshed, primaryAfterRefresh.id);
};
