import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  Box,
  Collapse,
  Flex,
  Icon,
  LinkBox,
  LinkOverlay,
  StackDivider,
  Text,
  Input,
  VStack,
} from "@chakra-ui/react";
import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import { format } from "timeago.js";
import {
  createMemeComment,
  getMemeComments,
  GetMemeCommentsResponse,
  getMemes,
  GetMemesResponse,
  getUserById,
  GetUserByIdResponse,
} from "../../api";
import { useAuthToken } from "../../contexts/authentication";
import { Loader } from "../../components/loader";
import { MemePicture } from "../../components/meme-picture";
import { useState } from "react";
import { jwtDecode } from "jwt-decode";


// // Custom hook to fetch memes, users, and comments
// const useMemesWithDetails = (page, token) => {
//   // Fetch memes
//   const { data: memesData, isLoading: memesLoading } = useQuery({
//     queryKey: ['memes', page],
//     queryFn: () => getMemes(token, page),
//   });

//   // Fetch authors and comments for all memes
//   const userQueries = useQuery({
//     queryKey: ['users', memesData?.results.map(meme => meme.authorId)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const userPromises = memesData.results.map(meme =>
//         getUserById(token, meme.authorId)
//       );
//       return Promise.all(userPromises);
//     },
//     enabled: !!memesData,
//   });

//   const commentQueries = useQuery({
//     queryKey: ['comments', memesData?.results.map(meme => meme.id)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const commentPromises = memesData.results.map(meme =>
//         getMemeComments(token, meme.id, 1)
//       );
//       return Promise.all(commentPromises);
//     },
//     enabled: !!memesData,
//   });

//   return {
//     memeDetails: memesData?.results.map((meme, index) => ({
//       ...meme,
//       author: userQueries.data?.[index],
//       comments: commentQueries.data?.[index],
//     })),
//     memesLoading: memesLoading || userQueries.isLoading || commentQueries.isLoading,
//   };
// };

// Custom hook to fetch memes, users, and comments
const useMemesWithDetails = (page, token) => {
  // Fetch memes
  const { data: memesData, isLoading: memesLoading } = useQuery({
    queryKey: ['memes', page],
    queryFn: () => getMemes(token, page),
  });

  // Fetch authors for memes
  const userQueries = useQuery({
    queryKey: ['users', memesData?.results.map(meme => meme.authorId)],
    queryFn: async () => {
      if (!memesData?.results) return [];
      const userPromises = memesData.results.map(meme =>
        getUserById(token, meme.authorId)
      );
      return Promise.all(userPromises);
    },
    enabled: !!memesData,
  });

  // Fetch comments for each meme and their respective authors
  const commentQueries = useQuery({
    queryKey: ['comments', memesData?.results.map(meme => meme.id)],
    queryFn: async () => {
      if (!memesData?.results) return [];
      const commentPromises = memesData.results.map(async (meme) => {
        const comments = await getMemeComments(token, meme.id, 1);
        
        // Récupérer les auteurs de chaque commentaire
        const commentAuthorsPromises = comments.results.map(comment =>
          getUserById(token, comment.authorId)
        );
        
        // Attendre toutes les promesses pour les auteurs
        const commentAuthors = await Promise.all(commentAuthorsPromises);
        
        // Associer chaque auteur avec le commentaire correspondant
        return comments.results.map((comment, index) => ({
          ...comment,
          author: commentAuthors[index], // Associe l'auteur correct pour chaque commentaire
        }));
      });
      return Promise.all(commentPromises);
    },
    enabled: !!memesData,
  });

  return {
    memeDetails: memesData?.results.map((meme, index) => ({
      ...meme,
      author: userQueries.data?.[index],
      comments: commentQueries.data?.[index] ?? [], // Associez les commentaires ici
    })),
    memesLoading: memesLoading || userQueries.isLoading || commentQueries.isLoading,
  };
};

export const MemeFeedPage: React.FC = () => {
  const token = useAuthToken();
  // Set openedCommentSection to be either string (meme ID) or null
  const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});

  const page = 1; // Example: the first page
  const { memeDetails, memesLoading } = useMemesWithDetails(page, token);

  if (memesLoading) return <div>Loading memes...</div>;

  return (
    <Flex width="full" height="full" justifyContent="center" overflowY="auto">
      <VStack
        p={4}
        width="full"
        maxWidth={800}
        divider={<StackDivider borderColor="gray.200" />}
      >
        {memeDetails?.map((meme) => {
          return (
            <VStack key={meme.id} p={4} width="full" align="stretch">
              <Flex justifyContent="space-between" alignItems="center">
                <Flex>
                  <Avatar
                    borderWidth="1px"
                    borderColor="gray.300"
                    size="xs"
                    name={meme.author?.username}
                    src={meme.author?.pictureUrl}
                  />
                  <Text ml={2} data-testid={`meme-author-${meme.id}`}>
                    {meme.author?.username}
                  </Text>
                </Flex>
                <Text fontStyle="italic" color="gray.500" fontSize="small">
                  {format(new Date(meme.createdAt), 'PPpp')}
                </Text>
              </Flex>
              <MemePicture
                pictureUrl={meme.pictureUrl}
                texts={meme.texts}
                dataTestId={`meme-picture-${meme.id}`}
              />
              <Box>
                <Text fontWeight="bold" fontSize="medium" mb={2}>
                  Description:{" "}
                </Text>
                <Box
                  p={2}
                  borderRadius={8}
                  border="1px solid"
                  borderColor="gray.100"
                >
                  <Text
                    color="gray.500"
                    whiteSpace="pre-line"
                    data-testid={`meme-description-${meme.id}`}
                  >
                    {meme.description}
                  </Text>
                </Box>
              </Box>
              <LinkBox as={Box} py={2} borderBottom="1px solid black">
                <Flex justifyContent="space-between" alignItems="center">
                  <Flex alignItems="center">
                    <LinkOverlay
                      data-testid={`meme-comments-section-${meme.id}`}
                      cursor="pointer"
                      onClick={() =>
                        setOpenedCommentSection(
                          openedCommentSection === meme.id
                            ? null
                            : meme.id
                        )
                      }
                    >
                      <Text data-testid={`meme-comments-count-${meme.id}`}>
                        {meme.comments?.length || 0} comments
                      </Text>
                    </LinkOverlay>
                    <Icon
                      as={
                        openedCommentSection !== meme.id
                          ? CaretDown
                          : CaretUp
                      }
                      ml={2}
                      mt={1}
                    />
                  </Flex>
                  <Icon as={Chat} />
                </Flex>
              </LinkBox>
              <Collapse in={openedCommentSection === meme.id} animateOpacity>
                <Box mb={6}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (commentContent[meme.id]) {
                        // Call mutation function (not provided in original example)
                        // mutate({
                        //   memeId: meme.id,
                        //   content: commentContent[meme.id],
                        // });
                      }
                    }}
                  >
                    <Flex alignItems="center">
                      <Input
                        placeholder="Type your comment here..."
                        onChange={(event) => {
                          setCommentContent({
                            ...commentContent,
                            [meme.id]: event.target.value,
                          });
                        }}
                        value={commentContent[meme.id] || ''}
                      />
                    </Flex>
                  </form>
                </Box>
                <VStack align="stretch" spacing={4}>
                  {meme?.comments?.map((comment) => (
                    <Flex key={comment.id}>
                      <Avatar
                        borderWidth="1px"
                        borderColor="gray.300"
                        size="sm"
                        name={comment.author?.username} // Afficher le nom de l'auteur correct
                        src={comment.author?.pictureUrl} // Afficher l'avatar de l'auteur correct
                        mr={2}
                      />
                      <Box p={2} borderRadius={8} bg="gray.50" flexGrow={1}>
                        <Flex
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text data-testid={`meme-comment-author-${meme.id}-${comment.id}`}>
                            {comment.author?.username}
                          </Text>
                          <Text
                            fontStyle="italic"
                            color="gray.500"
                            fontSize="small"
                          >
                            {format(new Date(comment.createdAt), 'PPpp')}
                          </Text>
                        </Flex>
                        <Text
                          color="gray.500"
                          whiteSpace="pre-line"
                          data-testid={`meme-comment-content-${meme.id}-${comment.id}`}
                        >
                          {comment.content}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              </Collapse>
            </VStack>
          );
        })}
      </VStack>
    </Flex>
  );
};



// Right 2
// // Custom hook to fetch memes, users, and comments
// const useMemesWithDetails = (page, token) => {
//   // Fetch memes
//   const { data: memesData, isLoading: memesLoading } = useQuery({
//     queryKey: ['memes', page],
//     queryFn: () => getMemes(token, page),
//   });

//   // Fetch authors for memes
//   const userQueries = useQuery({
//     queryKey: ['users', memesData?.results.map(meme => meme.authorId)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const userPromises = memesData.results.map(meme =>
//         getUserById(token, meme.authorId)
//       );
//       return Promise.all(userPromises);
//     },
//     enabled: !!memesData,
//   });

//   // Fetch comments for each meme and their respective authors
//   const commentQueries = useQuery({
//     queryKey: ['comments', memesData?.results.map(meme => meme.id)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const commentPromises = memesData.results.map(async (meme) => {
//         const comments = await getMemeComments(token, meme.id, 1);
//         const commentAuthorsPromises = comments.results.map(comment =>
//           getUserById(token, comment.authorId)
//         );
//         const commentAuthors = await Promise.all(commentAuthorsPromises);
//         return comments.results.map((comment, index) => ({
//           ...comment,
//           author: commentAuthors[index], // Associez les informations de l'auteur avec chaque commentaire
//         }));
//       });
//       return Promise.all(commentPromises);
//     },
//     enabled: !!memesData,
//   });

//   return {
//     memeDetails: memesData?.results.map((meme, index) => ({
//       ...meme,
//       author: userQueries.data?.[index],
//       comments: commentQueries.data?.[index] ?? [], // Associez les commentaires ici
//     })),
//     memesLoading: memesLoading || userQueries.isLoading || commentQueries.isLoading,
//   };
// };

// export const MemeFeedPage: React.FC = () => {
//   const token = useAuthToken();
//   // Set openedCommentSection to be either string (meme ID) or null
//   const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);
//   const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});

//   const page = 1; // Example: the first page
//   const { memeDetails, memesLoading } = useMemesWithDetails(page, token);

//   if (memesLoading) return <div>Loading memes...</div>;

//   return (
//     <Flex width="full" height="full" justifyContent="center" overflowY="auto">
//       <VStack
//         p={4}
//         width="full"
//         maxWidth={800}
//         divider={<StackDivider borderColor="gray.200" />}
//       >
//         {memeDetails?.map((meme) => {
//           return (
//             <VStack key={meme.id} p={4} width="full" align="stretch">
//               <Flex justifyContent="space-between" alignItems="center">
//                 <Flex>
//                   <Avatar
//                     borderWidth="1px"
//                     borderColor="gray.300"
//                     size="xs"
//                     name={meme.author?.username}
//                     src={meme.author?.pictureUrl}
//                   />
//                   <Text ml={2} data-testid={`meme-author-${meme.id}`}>
//                     {meme.author?.username}
//                   </Text>
//                 </Flex>
//                 <Text fontStyle="italic" color="gray.500" fontSize="small">
//                   {format(new Date(meme.createdAt), 'PPpp')}
//                 </Text>
//               </Flex>
//               <MemePicture
//                 pictureUrl={meme.pictureUrl}
//                 texts={meme.texts}
//                 dataTestId={`meme-picture-${meme.id}`}
//               />
//               <Box>
//                 <Text fontWeight="bold" fontSize="medium" mb={2}>
//                   Description:{" "}
//                 </Text>
//                 <Box
//                   p={2}
//                   borderRadius={8}
//                   border="1px solid"
//                   borderColor="gray.100"
//                 >
//                   <Text
//                     color="gray.500"
//                     whiteSpace="pre-line"
//                     data-testid={`meme-description-${meme.id}`}
//                   >
//                     {meme.description}
//                   </Text>
//                 </Box>
//               </Box>
//               <LinkBox as={Box} py={2} borderBottom="1px solid black">
//                 <Flex justifyContent="space-between" alignItems="center">
//                   <Flex alignItems="center">
//                     <LinkOverlay
//                       data-testid={`meme-comments-section-${meme.id}`}
//                       cursor="pointer"
//                       onClick={() =>
//                         setOpenedCommentSection(
//                           openedCommentSection === meme.id
//                             ? null
//                             : meme.id
//                         )
//                       }
//                     >
//                       <Text data-testid={`meme-comments-count-${meme.id}`}>
//                         {meme.comments?.length || 0} comments
//                       </Text>
//                     </LinkOverlay>
//                     <Icon
//                       as={
//                         openedCommentSection !== meme.id
//                           ? CaretDown
//                           : CaretUp
//                       }
//                       ml={2}
//                       mt={1}
//                     />
//                   </Flex>
//                   <Icon as={Chat} />
//                 </Flex>
//               </LinkBox>
//               <Collapse in={openedCommentSection === meme.id} animateOpacity>
//                 <Box mb={6}>
//                   <form
//                     onSubmit={(event) => {
//                       event.preventDefault();
//                       if (commentContent[meme.id]) {
//                         // Call mutation function (not provided in original example)
//                         // mutate({
//                         //   memeId: meme.id,
//                         //   content: commentContent[meme.id],
//                         // });
//                       }
//                     }}
//                   >
//                     <Flex alignItems="center">
//                       <Input
//                         placeholder="Type your comment here..."
//                         onChange={(event) => {
//                           setCommentContent({
//                             ...commentContent,
//                             [meme.id]: event.target.value,
//                           });
//                         }}
//                         value={commentContent[meme.id] || ''}
//                       />
//                     </Flex>
//                   </form>
//                 </Box>
//                 <VStack align="stretch" spacing={4}>
//                   {meme?.comments?.map((comment) => (
//                     <Flex key={comment.id}>
//                       <Avatar
//                         borderWidth="1px"
//                         borderColor="gray.300"
//                         size="sm"
//                         name={comment.author?.username} // Display comment author name
//                         src={comment.author?.pictureUrl} // Display comment author picture
//                         mr={2}
//                       />
//                       <Box p={2} borderRadius={8} bg="gray.50" flexGrow={1}>
//                         <Flex
//                           justifyContent="space-between"
//                           alignItems="center"
//                         >
//                           <Text data-testid={`meme-comment-author-${meme.id}-${comment.id}`}>
//                             {comment.author?.username}
//                           </Text>
//                           <Text
//                             fontStyle="italic"
//                             color="gray.500"
//                             fontSize="small"
//                           >
//                             {format(new Date(comment.createdAt), 'PPpp')}
//                           </Text>
//                         </Flex>
//                         <Text
//                           color="gray.500"
//                           whiteSpace="pre-line"
//                           data-testid={`meme-comment-content-${meme.id}-${comment.id}`}
//                         >
//                           {comment.content}
//                         </Text>
//                       </Box>
//                     </Flex>
//                   ))}
//                 </VStack>
//               </Collapse>
//             </VStack>
//           );
//         })}
//       </VStack>
//     </Flex>
//   );
// };
// Right 2




// Right
// // Custom hook to fetch memes, users, and comments
// const useMemesWithDetails = (page, token) => {
//   // Fetch memes
//   const { data: memesData, isLoading: memesLoading } = useQuery({
//     queryKey: ['memes', page],
//     queryFn: () => getMemes(token, page),
//   });

//   // Fetch authors and comments for all memes
//   const userQueries = useQuery({
//     queryKey: ['users', memesData?.results.map(meme => meme.authorId)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const userPromises = memesData.results.map(meme =>
//         getUserById(token, meme.authorId)
//       );
//       return Promise.all(userPromises);
//     },
//     enabled: !!memesData,
//   });

//   const commentQueries = useQuery({
//     queryKey: ['comments', memesData?.results.map(meme => meme.id)],
//     queryFn: async () => {
//       if (!memesData?.results) return [];
//       const commentPromises = memesData.results.map(meme =>
//         getMemeComments(token, meme.id, 1) // Assurez-vous que `getMemeComments` renvoie un tableau de commentaires
//       );
//       return Promise.all(commentPromises);
//     },
//     enabled: !!memesData,
//   });

//   return {
//     memeDetails: memesData?.results.map((meme, index) => ({
//       ...meme,
//       author: userQueries.data?.[index],
//       comments: commentQueries.data?.[index]?.results ?? [], // Ajoutez un tableau de commentaires ici
//     })),
//     memesLoading: memesLoading || userQueries.isLoading || commentQueries.isLoading,
//   };
// };

// export const MemeFeedPage: React.FC = () => {
//   const token = useAuthToken();
//   // Set openedCommentSection to be either string (meme ID) or null
//   const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);
//   const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});

//   const page = 1; // Example: the first page
//   const { memeDetails, memesLoading } = useMemesWithDetails(page, token);

//   if (memesLoading) return <div>Loading memes...</div>;

//   return (
//     <Flex width="full" height="full" justifyContent="center" overflowY="auto">
//       <VStack
//         p={4}
//         width="full"
//         maxWidth={800}
//         divider={<StackDivider borderColor="gray.200" />}
//       >
//         {memeDetails?.map((meme) => {
//           return (
//             <VStack key={meme.id} p={4} width="full" align="stretch">
//               <Flex justifyContent="space-between" alignItems="center">
//                 <Flex>
//                   <Avatar
//                     borderWidth="1px"
//                     borderColor="gray.300"
//                     size="xs"
//                     name={meme.author?.username}
//                     src={meme.author?.pictureUrl}
//                   />
//                   <Text ml={2} data-testid={`meme-author-${meme.id}`}>
//                     {meme.author?.username}
//                   </Text>
//                 </Flex>
//                 <Text fontStyle="italic" color="gray.500" fontSize="small">
//                   {format(new Date(meme.createdAt), 'PPpp')}
//                 </Text>
//               </Flex>
//               <MemePicture
//                 pictureUrl={meme.pictureUrl}
//                 texts={meme.texts}
//                 dataTestId={`meme-picture-${meme.id}`}
//               />
//               <Box>
//                 <Text fontWeight="bold" fontSize="medium" mb={2}>
//                   Description:{" "}
//                 </Text>
//                 <Box
//                   p={2}
//                   borderRadius={8}
//                   border="1px solid"
//                   borderColor="gray.100"
//                 >
//                   <Text
//                     color="gray.500"
//                     whiteSpace="pre-line"
//                     data-testid={`meme-description-${meme.id}`}
//                   >
//                     {meme.description}
//                   </Text>
//                 </Box>
//               </Box>
//               <LinkBox as={Box} py={2} borderBottom="1px solid black">
//                 <Flex justifyContent="space-between" alignItems="center">
//                   <Flex alignItems="center">
//                     <LinkOverlay
//                       data-testid={`meme-comments-section-${meme.id}`}
//                       cursor="pointer"
//                       onClick={() =>
//                         setOpenedCommentSection(
//                           openedCommentSection === meme.id
//                             ? null
//                             : meme.id
//                         )
//                       }
//                     >
//                       <Text data-testid={`meme-comments-count-${meme.id}`}>
//                         {meme.comments?.length || 0} comments
//                       </Text>
//                     </LinkOverlay>
//                     <Icon
//                       as={
//                         openedCommentSection !== meme.id
//                           ? CaretDown
//                           : CaretUp
//                       }
//                       ml={2}
//                       mt={1}
//                     />
//                   </Flex>
//                   <Icon as={Chat} />
//                 </Flex>
//               </LinkBox>
//               <Collapse in={openedCommentSection === meme.id} animateOpacity>
//                 <Box mb={6}>
//                   <form
//                     onSubmit={(event) => {
//                       event.preventDefault();
//                       if (commentContent[meme.id]) {
//                         // Call mutation function (not provided in original example)
//                         // mutate({
//                         //   memeId: meme.id,
//                         //   content: commentContent[meme.id],
//                         // });
//                       }
//                     }}
//                   >
//                     <Flex alignItems="center">
//                       <Input
//                         placeholder="Type your comment here..."
//                         onChange={(event) => {
//                           setCommentContent({
//                             ...commentContent,
//                             [meme.id]: event.target.value,
//                           });
//                         }}
//                         value={commentContent[meme.id] || ''}
//                       />
//                     </Flex>
//                   </form>
//                 </Box>
//                 <VStack align="stretch" spacing={4}>
//                   {meme?.comments?.map((comment) => (
//                     <Flex key={comment.id}>
//                       <Avatar
//                         borderWidth="1px"
//                         borderColor="gray.300"
//                         size="sm"
//                         name={comment.authorId}
//                         src={comment.authorId} // Replace with real author picture when available
//                         mr={2}
//                       />
//                       <Box p={2} borderRadius={8} bg="gray.50" flexGrow={1}>
//                         <Flex
//                           justifyContent="space-between"
//                           alignItems="center"
//                         >
//                           <Text data-testid={`meme-comment-author-${meme.id}-${comment.id}`}>
//                             {comment.authorId} {/* Replace with real author name when available */}
//                           </Text>
//                           <Text
//                             fontStyle="italic"
//                             color="gray.500"
//                             fontSize="small"
//                           >
//                             {format(new Date(comment.createdAt), 'PPpp')}
//                           </Text>
//                         </Flex>
//                         <Text
//                           color="gray.500"
//                           whiteSpace="pre-line"
//                           data-testid={`meme-comment-content-${meme.id}-${comment.id}`}
//                         >
//                           {comment.content}
//                         </Text>
//                       </Box>
//                     </Flex>
//                   ))}
//                 </VStack>
//               </Collapse>
//             </VStack>
//           );
//         })}
//       </VStack>
//     </Flex>
//   );
// };
// Right



// export const MemeFeedPage: React.FC = () => {
//   const token = useAuthToken();
//   // Set openedCommentSection to be either string (meme ID) or null
//   const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);

//   const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});

//   const page = 1; // Example: the first page
//   const { memeDetails, memesLoading } = useMemesWithDetails(page, token);

//   if (memesLoading) return <div>Loading memes...</div>;

//   return (
//     <Flex width="full" height="full" justifyContent="center" overflowY="auto">
//       <VStack
//         p={4}
//         width="full"
//         maxWidth={800}
//         divider={<StackDivider borderColor="gray.200" />}
//       >
//         {memeDetails?.map((meme) => {
//           return (
//             <VStack key={meme.id} p={4} width="full" align="stretch">
//               <Flex justifyContent="space-between" alignItems="center">
//                 <Flex>
//                   <Avatar
//                     borderWidth="1px"
//                     borderColor="gray.300"
//                     size="xs"
//                     name={meme.author?.username}
//                     src={meme.author?.pictureUrl}
//                   />
//                   <Text ml={2} data-testid={`meme-author-${meme.id}`}>
//                     {meme.author?.username}
//                   </Text>
//                 </Flex>
//                 <Text fontStyle="italic" color="gray.500" fontSize="small">
//                   {format(new Date(meme.createdAt), 'PPpp')}
//                 </Text>
//               </Flex>
//               <MemePicture
//                 pictureUrl={meme.pictureUrl}
//                 texts={meme.texts}
//                 dataTestId={`meme-picture-${meme.id}`}
//               />
//               <Box>
//                 <Text fontWeight="bold" fontSize="medium" mb={2}>
//                   Description:{" "}
//                 </Text>
//                 <Box
//                   p={2}
//                   borderRadius={8}
//                   border="1px solid"
//                   borderColor="gray.100"
//                 >
//                   <Text
//                     color="gray.500"
//                     whiteSpace="pre-line"
//                     data-testid={`meme-description-${meme.id}`}
//                   >
//                     {meme.description}
//                   </Text>
//                 </Box>
//               </Box>
//               <LinkBox as={Box} py={2} borderBottom="1px solid black">
//                 <Flex justifyContent="space-between" alignItems="center">
//                   <Flex alignItems="center">
//                     <LinkOverlay
//                       data-testid={`meme-comments-section-${meme.id}`}
//                       cursor="pointer"
//                       onClick={() =>
//                         setOpenedCommentSection(
//                           openedCommentSection === meme.id
//                             ? null
//                             : meme.id
//                         )
//                       }
//                     >
//                       <Text data-testid={`meme-comments-count-${meme.id}`}>
//                         {meme.comments?.length || 0} comments
//                       </Text>
//                     </LinkOverlay>
//                     <Icon
//                       as={
//                         openedCommentSection !== meme.id
//                           ? CaretDown
//                           : CaretUp
//                       }
//                       ml={2}
//                       mt={1}
//                     />
//                   </Flex>
//                   <Icon as={Chat} />
//                 </Flex>
//               </LinkBox>
//               <Collapse in={openedCommentSection === meme.id} animateOpacity>
//                 <Box mb={6}>
//                   <form
//                     onSubmit={(event) => {
//                       event.preventDefault();
//                       if (commentContent[meme.id]) {
//                         // Call mutation function (not provided in original example)
//                         // mutate({
//                         //   memeId: meme.id,
//                         //   content: commentContent[meme.id],
//                         // });
//                       }
//                     }}
//                   >
//                     <Flex alignItems="center">
//                       {/* <Avatar
//                         borderWidth="1px"
//                         borderColor="gray.300"
//                         name={user?.username}
//                         src={user?.pictureUrl}
//                         size="sm"
//                         mr={2}
//                       /> */}
//                       <Input
//                         placeholder="Type your comment here..."
//                         onChange={(event) => {
//                           setCommentContent({
//                             ...commentContent,
//                             [meme.id]: event.target.value,
//                           });
//                         }}
//                         value={commentContent[meme.id] || ''}
//                       />
//                     </Flex>
//                   </form>
//                 </Box>
//                 <VStack align="stretch" spacing={4}>
//                   {meme?.comments?.results?.map((comment) => (
//                     <Flex key={comment.id}>
//                       <Avatar
//                         borderWidth="1px"
//                         borderColor="gray.300"
//                         size="sm"
//                         // name={comment.author.username}
//                         // src={comment.author.pictureUrl}
//                         name={comment.authorId}
//                         src={comment.authorId}
//                         mr={2}
//                       />
//                       <Box p={2} borderRadius={8} bg="gray.50" flexGrow={1}>
//                         <Flex
//                           justifyContent="space-between"
//                           alignItems="center"
//                         >
//                           <Text
//                             data-testid={`meme-comment-author-${meme.id}-${comment.id}`}
//                           >
//                             {/* {comment.author.username} */}
//                             {comment.authorId}
//                           </Text>
//                           <Text
//                             fontStyle="italic"
//                             color="gray.500"
//                             fontSize="small"
//                           >
//                             {format(new Date(comment.createdAt), 'PPpp')}
//                           </Text>
//                         </Flex>
//                         <Text
//                           color="gray.500"
//                           whiteSpace="pre-line"
//                           data-testid={`meme-comment-content-${meme.id}-${comment.id}`}
//                         >
//                           {comment.content}
//                         </Text>
//                       </Box>
//                     </Flex>
//                   ))}
//                 </VStack>
//               </Collapse>
//             </VStack>
//           );
//         })}
//       </VStack>
//     </Flex>
//   );
// };

export const Route = createFileRoute("/_authentication/")({
  component: MemeFeedPage,
});
